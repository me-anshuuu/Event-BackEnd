import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

console.log("Starting database repair and server process...");

// Function to run command and return output
function runCommandSync(command) {
  try {
    console.log(`Running command: ${command}`);
    const output = execSync(command, { 
      encoding: 'utf8',
      stdio: 'inherit' // This will show output in real-time
    });
    return { success: true, output };
  } catch (error) {
    console.error(`Error executing command: ${command}`);
    console.error(error.message);
    return { success: false, error };
  }
}

// Ensure the repair scripts exist
const repairScriptPath = path.join(process.cwd(), 'repair-db.js');
const fixUsersScriptPath = path.join(process.cwd(), 'fix-duplicate-users.js');

if (!fs.existsSync(repairScriptPath)) {
  console.error(`Repair script not found at: ${repairScriptPath}`);
  process.exit(1);
}

// Run database repair directly with node
console.log("Running database repair script...");
const repairResult = runCommandSync('node --experimental-modules repair-db.js');

if (!repairResult.success) {
  console.error("Database repair failed, but will attempt to continue");
}

// Run fix duplicate users script if it exists
if (fs.existsSync(fixUsersScriptPath)) {
  console.log("Running fix duplicate users script...");
  const fixUsersResult = runCommandSync('node --experimental-modules fix-duplicate-users.js');
  
  if (!fixUsersResult.success) {
    console.error("Fix duplicate users failed, but will attempt to continue");
  }
} else {
  console.log("Fix duplicate users script not found, skipping");
}

// Start the server
console.log("Starting server...");
runCommandSync('node server.js'); 