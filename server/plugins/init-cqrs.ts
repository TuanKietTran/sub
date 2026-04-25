import { mountVendor } from "@core/cqrs";

export default defineNitroPlugin((nitro) => {
   // This runs exactly once when the Nitro server starts
   console.log("🚀 Initializing CQRS Mediator...");
   mountVendor();
});
