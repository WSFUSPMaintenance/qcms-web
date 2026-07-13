# Deployment artifacts

`initial-inspection-schedule.csv` is generated from `data/forms.json` by running `npm run generate:schedule`. Import it only after the target SharePoint list has a unique indexed `ScheduleKey` text column and the department routing table has been validated.
