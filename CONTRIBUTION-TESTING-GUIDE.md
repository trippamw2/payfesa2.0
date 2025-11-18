# PayFesa Contribution Flow Testing Guide

## Prerequisites Checklist

### 1. PayChangu API Configuration ✅
- Provider: `paychangu`
- Mode: `LIVE`
- API Key: Configured
- Status: Enabled

### 2. Mobile Money Account Setup ⚠️ **REQUIRED FIRST**

Before testing contributions, users MUST add a mobile money account:

**Steps:**
1. Navigate to `/payment-accounts` or Settings → Payment Accounts
2. Click "Add Mobile Money Account"
3. Enter details:
   - Provider: `Airtel Money` or `TNM Mpamba`
   - Phone Number: `+2659XXXXXXXX` (9 digits after country code)
   - Account Name: Your name
4. Verify the account (if verification flow exists)

**Expected Database Entry:**
```sql
INSERT INTO mobile_money_accounts (
  user_id, 
  phone_number, 
  provider, 
  account_name,
  is_verified,
  is_primary
)
```

---

## Testing Flow: PIN → Payment → Confirmation

### Phase 1: Pre-Contribution Validation

**Test 1: Group Membership Check**
```
Expected: User must be member of group
Error if not: "You are not a member of this group"
```

**Test 2: Group Status Check**
```
Expected: Group status = 'active'
Error if not: "Group is not active"
```

**Test 3: Payment Account Check**
```
Expected: At least one mobile money account exists
Error if not: "Payment account not found"
```

---

### Phase 2: Contribution Submission

**Request Format:**
```json
{
  "groupId": "uuid",
  "amount": 5000,
  "paymentMethod": "airtel" | "tnm" | "mpamba",
  "phoneNumber": "+265982972977",
  "pin": "1234",
  "accountId": "uuid (optional)"
}
```

**Expected Edge Function Logs:**
```
[REQUEST_ID] === NEW REQUEST ===
[REQUEST_ID] Client IP: xxx.xxx.xxx.xxx
[REQUEST_ID] Authenticating user...
[REQUEST_ID] User authenticated: ef8c10e0-...
[REQUEST_ID] Request data: { groupId, amount, paymentMethod, phoneNumber: '***2977', accountId: 'N/A' }
[REQUEST_ID] Fetching PayChangu configuration...
[REQUEST_ID] Using PayChangu LIVE mode
[REQUEST_ID] Verifying group membership...
[REQUEST_ID] Group verified: Zingwangwa Saves
[REQUEST_ID] Generated charge ID: PC1731934567890ABC
[REQUEST_ID] Payment type: Mobile Money
[REQUEST_ID] Verifying payment account: <accountId>
[REQUEST_ID] Using verified account: airtel - 982972977
[REQUEST_ID] Initiating payment with PayChangu...
[REQUEST_ID] PayChangu response: pending - Ref: <ref_id>
[REQUEST_ID] Fee calculation: Amount=5000, Fee=550, Net=4450
[REQUEST_ID] Creating contribution record...
[REQUEST_ID] Contribution created: <contribution_id>
[REQUEST_ID] Creating mobile money transaction record...
[REQUEST_ID] Mobile money transaction recorded
[REQUEST_ID] Creating transaction record...
[REQUEST_ID] Transaction record created
[REQUEST_ID] Preparing notifications...
[REQUEST_ID] Sending push notification...
[REQUEST_ID] Push notification sent
[REQUEST_ID] Sending system message to group...
[REQUEST_ID] System message sent
[REQUEST_ID] === REQUEST COMPLETED SUCCESSFULLY ===
```

---

### Phase 3: Payment Processing (PayChangu)

**Mobile Money Flow:**
1. **Initialize Payment** → PayChangu API
   ```
   POST https://api.paychangu.com/mobile-money/payments/initialize
   Body: {
     "mobile": "982972977",
     "mobile_money_operator_ref_id": "20be6c20-adeb-4b5b-a7ba-0769820df4fb",
     "amount": "5000",
     "charge_id": "PC1731934567890ABC"
   }
   ```

2. **User Receives USSD Prompt** on phone
   - Airtel: `*115#` prompt
   - TNM: `*114#` prompt

3. **User Enters PIN** on phone

4. **PayChangu Webhook** (async callback)
   ```
   POST /api/paychangu-webhook
   Body: {
     "status": "success",
     "charge_id": "PC1731934567890ABC",
     "ref_id": "<paychangu_ref>",
     "trace_id": "<trace_id>"
   }
   ```

5. **Update Records:**
   - `contributions.status` → `completed`
   - `mobile_money_transactions.status` → `completed`
   - `transactions.status` → `completed`
   - `users.escrow_balance` → +4450 (net amount)
   - `group_members.has_contributed` → `true`

---

### Phase 4: Post-Contribution Actions

**Expected Outcomes:**
1. ✅ Contribution record created
2. ✅ Mobile money transaction logged
3. ✅ Transaction record created
4. ✅ Push notification sent
5. ✅ System message posted to group chat
6. ✅ Trust score update queued
7. ✅ Escrow balance updated (after webhook confirms)

---

## Testing Commands

### Check Mobile Money Accounts
```sql
SELECT * FROM mobile_money_accounts 
WHERE user_id = 'ef8c10e0-3b0a-4164-b2de-77c49debe808';
```

### Check Recent Contributions
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

### Check Edge Function Logs
```bash
# In Lovable UI or Supabase Dashboard
Navigate to: Functions → process-contribution → Logs
Filter: Last 1 hour
```

### Manual Test Call (using curl)
```bash
curl -X POST https://fisljlameaewzwndwpsq.supabase.co/functions/v1/process-contribution \
  -H "Authorization: Bearer <USER_JWT_TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{
    "groupId": "2e87d5c3-a254-4c5c-b02e-911820654130",
    "amount": 5000,
    "paymentMethod": "airtel",
    "phoneNumber": "+265982972977",
    "pin": "1234"
  }'
```

---

## Common Issues & Solutions

### Issue 1: "Payment account not found"
**Solution:** Add mobile money account first at `/payment-accounts`

### Issue 2: "You are not a member of this group"
**Solution:** Join the group first or verify group_id is correct

### Issue 3: "Payment gateway not configured"
**Solution:** Admin needs to configure PayChangu in admin panel

### Issue 4: "Payment initialization failed"
**Solution:** 
- Check PayChangu API key is valid
- Verify phone number format (9 digits)
- Check provider name matches: `airtel`, `tnm`, `mpamba`

### Issue 5: Contribution stuck in "pending"
**Solution:**
- Check PayChangu webhook is configured
- Verify user completed USSD prompt on phone
- Check edge function logs for errors

---

## Success Criteria

### ✅ Full Flow Complete When:
1. Mobile money account registered
2. Contribution record created with `pending` status
3. PayChangu API called successfully
4. User receives USSD prompt
5. User completes payment on phone
6. Webhook received and processed
7. Contribution status → `completed`
8. Escrow balance updated
9. Notifications sent
10. Trust score updated

---

## Next Steps

1. **Add Mobile Money Account** → `/payment-accounts`
2. **Make Test Contribution** → Select group, enter amount, confirm PIN
3. **Complete USSD Payment** → On mobile phone
4. **Verify in Dashboard** → Check contribution appears
5. **Check Logs** → Verify all steps logged correctly

---

## Support

For issues:
1. Check edge function logs in Supabase Dashboard
2. Verify PayChangu configuration
3. Test with small amount first (e.g., MWK 100)
4. Contact PayChangu support if API issues persist
