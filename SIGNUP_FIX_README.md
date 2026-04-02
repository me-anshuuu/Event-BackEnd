# Sign-up Issue Fix Documentation

## Problem Identified

The main issue with user registration was due to:

1. A unique index on the `phone` field causing duplicate key errors with empty strings (`""`)
2. The user model automatically setting empty phones to `""` instead of `null`
3. Possible case-sensitivity issues with email indexes

## Fixes Applied

We've created multiple fix scripts and applied these changes:

1. **Fixed Phone Index**:
   - Dropped the unique phone index
   - Created a new non-unique, sparse phone index that only includes documents where phone exists
   - Updated all users with empty phone values (`""`) to `null`

2. **Fixed User Model**:
   - Updated the model to set default phone value to `null` instead of `""`
   - Added pre-save hook to convert empty phone strings to `null`
   - Improved schema configuration with proper sparse settings

3. **Fixed Auth Controller**:
   - Updated signup method to explicitly set phone to `null` during user creation
   - Added specific error handling for phone-related errors
   - Improved error messaging

4. **Fixed Email Index**:
   - Recreated case-insensitive email index with proper collation
   - Ensured proper uniqueness constraints are in place

## Verifying the Fixes

The fixes have been successfully applied to your database. You should:

1. Restart your backend server if it's already running:
   ```
   npm run server
   ```

2. Test registration with a new email address to confirm it works

## If Issues Persist

If you still encounter registration issues:

1. Check server logs for any new error messages
2. Run our direct fix script:
   ```
   npm run fix-phone
   ```

3. For a comprehensive fix and server restart:
   ```
   npm run restart-fixed
   ```

## Additional Information

The main error was: `E11000 duplicate key error collection: Homease.users index: phone_1 dup key: { phone: "" }`

This occurred because:
- MongoDB was treating all empty phone strings as the same value
- The unique index on phone fields was preventing multiple users with empty phone fields
- Our fix makes the phone field nullable and non-unique, allowing multiple users with empty/null phones

The update should allow all valid new user registrations to proceed without duplicate key errors. 