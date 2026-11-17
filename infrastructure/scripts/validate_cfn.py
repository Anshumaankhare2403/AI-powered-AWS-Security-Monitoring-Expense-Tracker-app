import os
import glob
import cfnlint.core
import cfnlint.config
import cfnlint.runner

cfn_dir = r"d:\AI-powered-AWS-Security-Monitoring-Expense-Tracker-app\infrastructure\cloudformation"
templates = glob.glob(os.path.join(cfn_dir, "*.yml"))

all_passed = True
for t in templates:
    rel_name = os.path.basename(t)
    print(f"\n--- Linting {rel_name} ---")
    config = cfnlint.config.ConfigMixIn([t])
    runner = cfnlint.runner.Runner(config)
    matches = list(runner.run())
    if not matches:
        print(f"PASS: {rel_name} has 0 errors or warnings.")
    else:
        has_error = False
        for m in matches:
            print(f"[{m.rule.id}] {m.message} (Line {m.linenumber})")
            if m.rule.id.startswith("E"):
                has_error = True
        if has_error:
            all_passed = False

if all_passed:
    print("\nALL CLOUDFORMATION TEMPLATES VALIDATED SUCCESSFULLY!")
else:
    print("\nSome templates had errors.")
