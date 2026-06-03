export const SHIP_IT_ACTIONS = [
  "Deployed to prod",
  "Pushed a hotfix",
  "Merged without review",
  "Closed a ticket without reading it",
  "Pushed directly to main",
  "Skipped the tests (they were slow)",
  "Applied a StackOverflow answer verbatim",
  "Ran terraform apply and looked away",
  "Clicked 'Yes' on the scary dialog",
  "Rotated credentials (into the wrong env)",
  "Shipped it on a Friday",
  "Restarted the server (worked somehow)",
  "Force-pushed (just this once)",
  "Pinged prod to see if it's alive",
  "Opened a PR to close a PR",
  "Resolved a merge conflict by deleting both sides",
  "Typed rm -rf and then thought better of it",
  "Committed the .env file (fixed immediately after)",
  "Blamed it on a library update",
  "Scheduled an incident review for never",
];

export const MILESTONE_MESSAGES: Array<{ credits: number; message: string }> = [
  {
    credits: 100,
    message: "You've bootstrapped. No VC would take your call anyway.",
  },
  {
    credits: 1000,
    message: "Your EC2 bill is now larger than your income. Congrats.",
  },
  {
    credits: 10000,
    message: "Series A closed. They gave you money. You have no idea why.",
  },
  {
    credits: 100000,
    message: "You have a VP of Cloud. You don't know what they do.",
  },
  {
    credits: 1000000,
    message: "You're on the AWS homepage. As a cautionary tale.",
  },
  {
    credits: 100000000,
    message: "Analysts call you 'cloud-native.' You haven't slept in days.",
  },
  {
    credits: 1000000000,
    message: "You've achieved Eventual Consistency. The data is still inconsistent.",
  },
];
