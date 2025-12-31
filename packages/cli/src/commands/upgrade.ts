import { VERSION } from "../version";
import { backgroundUpgrade, type UpgradeStatus } from "./auto-upgrade";

export async function upgrade(): Promise<void> {
  console.log(`Current version: v${VERSION}`);
  console.log("Checking for updates...\n");

  let finalStatus: UpgradeStatus = { status: "current" };

  await backgroundUpgrade((status) => {
    finalStatus = status;

    switch (status.status) {
      case "checking":
        process.stdout.write("  Checking... ");
        break;
      case "downloading":
        console.log(`found v${status.version}`);
        process.stdout.write("  Downloading... ");
        break;
      case "ready":
        console.log("done!\n");
        console.log(`✓ Updated to v${status.version}`);
        console.log("  Restart burl to use the new version.");
        break;
      case "failed":
        console.log(`\n✗ Upgrade failed: ${status.error}`);
        break;
    }
  });

  if (finalStatus.status === "current") {
    console.log(`✓ Already on latest version (v${VERSION})`);
  }
}
