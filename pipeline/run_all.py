"""run_all - execute the offline build s0 -> s7.

Every stage is idempotent and independently re-runnable; this just runs them in
dependency order and stops at the first failure, because a half-built DB is
worse than no DB (design doc section 5).

    python pipeline/run_all.py
"""
import sys
import time
import traceback

import s0_handoff, s1_ingest, s2_normalize, s3_candidates
import s4_score, s5_status, s6_load_db, s7_export_fallback

STAGES = [
    ("s0 handoff", s0_handoff.build),
    ("s1 ingest", s1_ingest.run),
    ("s2 normalize", s2_normalize.run),
    ("s3 candidates", s3_candidates.run),
    ("s4 score", s4_score.run),
    ("s5 status", s5_status.run),
    ("s6 load_db", s6_load_db.run),
    ("s7 export_fallback", s7_export_fallback.run),
]


def main(skip_s0=False):
    t0 = time.time()
    for name, fn in STAGES:
        if skip_s0 and name.startswith("s0"):
            print("[skip] " + name)
            continue
        try:
            fn()
        except Exception as exc:
            print("\nFAILED at " + name + ": " + type(exc).__name__ + ": " + str(exc))
            traceback.print_exc()
            return 1
    print("\nbuild complete in %.1fs" % (time.time() - t0))
    return 0


if __name__ == "__main__":
    sys.exit(main(skip_s0="--skip-handoff" in sys.argv))
