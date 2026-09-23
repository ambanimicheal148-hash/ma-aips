# MA.AI.PS V346 — REAL BUSINESS KIT TEMPLATES

## One voice note → six deliverables

Input:
- business name
- location
- products/services
- prices
- phone/WhatsApp
- M-PESA payment instruction if the customer wants one
- preferred language

Output:
1. Poster 1080×1080
2. Price List PDF
3. WhatsApp Status 15-second video
4. Sheng/Swahili caption
5. M-PESA payment message
6. Business card
7. ZIP bundle containing the above when technically supported

## Universal data object

```json
{
  "business_name": "",
  "category": "",
  "location": "",
  "phone": "",
  "whatsapp": "",
  "language": "sw",
  "headline": "",
  "products": [
    {"name": "", "price_kes": 0}
  ],
  "offer": "",
  "hours": "",
  "payment_instruction": "",
  "disclaimer": "Customer-supplied business information; verify prices and contacts before publishing."
}
```

## Template A — Bei ya Leo

Headline: `BEI YA LEO`
Subline: `[PRODUCT] — KES [PRICE]`
CTA: `Agiza kupitia WhatsApp: [PHONE]`
Footer: `Bei ni za leo kulingana na taarifa ya biashara.`

## Template B — Poster Biashara

Headline: `[BUSINESS NAME]`
Offer: `[OFFER]`
Top products:
- [ITEM] — KES [PRICE]
- [ITEM] — KES [PRICE]
- [ITEM] — KES [PRICE]
CTA: `Piga/WhatsApp [PHONE]`

## Template C — Invoice + payment message

Invoice fields:
- Invoice ID
- Customer
- Items
- Quantity
- Unit price
- Total
- Date
- Payment status

Payment message:
`M-PESA: Tuma KES [TOTAL] kwa Till [TILL]. Tumia order/invoice [ORDER_ID] kama reference inapowezekana. Subiri uthibitisho wa malipo.`

## Template D — Church / fundraiser

Headline: `[EVENT NAME]`
Date: `[DATE]`
Venue: `[VENUE]`
Purpose: `[PURPOSE]`
Contact: `[CONTACT]`

Do not imply official sponsorship or guaranteed fundraising results.

## Template E — Farm produce

Headline: `FRESH [PRODUCT] AVAILABLE`
Items:
- [PRODUCT] — KES [PRICE]
- [PRODUCT] — KES [PRICE]
Delivery/pickup: [DETAIL]
Contact: [PHONE]

## Template F — CV + Cover

Inputs:
- target role
- name
- verified education
- verified experience
- skills
- contact
- job advert/source

Output:
- ATS-friendly CV
- tailored cover letter
- application checklist

Do not invent qualifications, employers, certificates or experience.

## Template G — Business card + WhatsApp catalogue

Business card:
`[BUSINESS]`
`[SERVICE]`
`Call/WhatsApp: [PHONE]`
`Location: [LOCATION]`

Catalogue:
`[ITEM] — KES [PRICE]`
`[SHORT DESCRIPTION]`

## Template H — KRA guidance

Output must include:
- task requested
- official source URL
- requirements found
- steps
- what the customer must verify
- date checked
- limitations

Never promise a government decision or certificate.

## Template I — Sheng/Dholuo/Swahili ↔ English

Always preserve:
- names
- amounts
- dates
- phone numbers
- business terms

Show the translated text and flag uncertain wording for human review.

## Template J — 15-second status video

0–3s: Business name
3–7s: Hero product + price
7–11s: Offer / reason to buy
11–15s: WhatsApp/phone CTA

Keep text readable on low-end Android screens and provide a still-image fallback.
