# Quick Test Guide: Contribution Flow

## Step 1: Add Mobile Money Account (Required First)

1. Navigate to **Settings → Payment Accounts** or directly to `/payment-accounts`
2. Click **"Add Mobile Money Account"** button
3. Fill in:
   - **Provider:** Select `Airtel Money` or `TNM Mpamba`
   - **Phone Number:** Enter your phone (e.g., `+265982972977`)
   - **Account Name:** Your name
4. Click **Save**
5. Verify account appears in the list with ✅ or ⏳ badge

## Step 2: Make Test Contribution

1. Go to **Dashboard**
2. Select a group (e.g., "Zingwangwa Saves" or "Chilobwe Growth Community")
3. Click **"Contribute Now"** button
4. Enter contribution amount (e.g., `5000` MWK)
5. Select your mobile money account from dropdown
6. Enter your 4-digit PIN
7. Click **"Confirm Contribution"**

## Step 3: Complete USSD Payment (On Your Phone)

**For Airtel Money:**
- You'll receive USSD prompt: `*115#`
- Follow prompts to approve payment
- Enter your Airtel Money PIN

**For TNM Mpamba:**
- You'll receive USSD prompt: `*114#`
- Follow prompts to approve payment  
- Enter your Mpamba PIN

## Step 4: Verify Success

**Check Dashboard:**
- Contribution should appear in "Recent Contributions"
- Status will change: `pending` → `completed` (after USSD confirmation)
- Trust score updated
- Group chat shows system message

**Check Edge Function Logs:**
1. Open Supabase Dashboard
2. Go to **Functions → process-contribution → Logs**
3. Look for your request ID logs showing:
   ```
   [REQUEST_ID] === NEW REQUEST ===
   [REQUEST_ID] User authenticated: <user_id>
   [REQUEST_ID] Group verified: <group_name>
   [REQUEST_ID] PayChangu response: pending - Ref: <ref_id>
   [REQUEST_ID] === REQUEST COMPLETED SUCCESSFULLY ===
   ```

## Expected Results

### ✅ Success Indicators:
1. **Immediate Response:**
   - Toast notification: "Contribution submitted successfully"
   - Contribution appears in list with `pending` status
   - Mobile money transaction created

2. **After USSD Confirmation (1-2 minutes):**
   - Contribution status → `completed`
   - Escrow balance updated (+4450 MWK for 5000 contribution)
   - Trust score increased (+5 points)
   - Push notification received
   - Group chat system message posted

3. **Database Records Created:**
   ```sql
   -- Check all records
   SELECT 
     c.id,
     c.amount,
     c.status as contribution_status,
     c.payment_method,
     mmt.status as mm_status,
     mmt.provider_response->>'status' as paychangu_status,
     t.status as transaction_status
   FROM contributions c
   LEFT JOIN mobile_money_transactions mmt ON c.transaction_id = mmt.transaction_id
   LEFT JOIN transactions t ON t.user_id = c.user_id AND t.group_id = c.group_id
   WHERE c.user_id = '<your_user_id>'
   ORDER BY c.created_at DESC
   LIMIT 1;
   ```

### ❌ Common Errors & Solutions:

**Error: "Payment account not found"**
- Solution: Add mobile money account first (Step 1)

**Error: "You are not a member of this group"**  
- Solution: Join the group first or select correct group

**Error: "Payment gateway not configured"**
- Solution: Contact admin to configure PayChangu

**Error: "Invalid mobile number"**
- Solution: Use format `+2659XXXXXXXX` (9 digits after 265)

**Contribution stuck in "pending"**
- Solution: Complete USSD payment on your phone
- Check PayChangu webhook is configured
- Wait 2-3 minutes for confirmation

## Test with Small Amount First

**Recommended:** Start with MWK 100-500 to verify flow works before larger contributions.

## Monitoring & Debugging

### Check Logs in Real-Time:
```bash
# Supabase Dashboard → Functions → process-contribution → Logs
# Filter: Last 1 hour
# Look for your request ID
```

### Query Recent Contributions:
```sql
SELECT 
  c.*,
  mmt.status as mm_status,
  mmt.provider_response
FROM contributions c
LEFT JOIN mobile_money_transactions mmt ON c.transaction_id = mmt.transaction_id
WHERE c.user_id = 'ef8c10e0-3b0a-4164-b2de-77c49debe808'
ORDER BY c.created_at DESC
LIMIT 5;
```

### Check Mobile Money Accounts:
```sql
SELECT * FROM mobile_money_accounts 
WHERE user_id = 'ef8c10e0-3b0a-4164-b2de-77c49debe808'
AND is_active = true;
```

## Fee Breakdown

For any contribution:
- **Total Amount:** MWK 5,000
- **Fee (11%):** MWK 550
  - 1% Payout Safety Fee: MWK 50
  - 5% Service & Protection: MWK 250
  - 6% Government Fees: MWK 300 (VAT)
- **Net to Escrow:** MWK 4,450

---

## Need Help?

1. Check edge function logs for detailed error messages
2. Verify PayChangu configuration in admin panel
3. Ensure mobile number format is correct
4. Test USSD payment works on your phone independently
5. Check if you completed phone payment approval

**Ready to test!** 🚀
