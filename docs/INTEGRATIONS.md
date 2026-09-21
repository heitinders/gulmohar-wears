# Enquiries and the future GoHighLevel connection

## Current boundary

`src/lib/enquiries/messages.ts` owns the versioned enquiry shape and message
serialization. UI components only call those functions. `src/lib/brand.ts` owns
channel destinations. There are no GHL credentials, CRM calls, API endpoints,
analytics tags, database writes or outgoing email in Phase 1.

The browser keeps form values in memory only. Submitting the form prepares a
preview; a separate real anchor opens WhatsApp. The floating Instagram shortcut and enquiry invitation open a DM; the footer icon links to the brand profile. Both destinations come from `brand.ts`. A future custom GHL funnel should be connected through this central channel boundary, not hard-coded into the floating controls.

Instagram opens a DM without
promising that Instagram accepts a prefilled message. Channel clicks are not
labelled purchases, confirmed orders or successful message sends.

## Future adapter contract, not implemented

When GHL is configured, a server-only `EnquirySink` can accept a validated v1
payload and return an enquiry ID. Map contact name and phone to the contact;
occasion, event date, destination, garment reference and notes to agreed custom
fields; the source page to attribution. The business must supply location ID,
field IDs, pipeline and stage mappings, consent text and credential strategy.

Do not assume a webhook shape or API version. Verify current official GHL docs
at integration time. Keep secrets server-side. Add validation, request size
limits, abuse controls, idempotency, bounded retries and explicit delivery
states. A CRM failure must leave the WhatsApp route available. Record only
necessary customer data after explicit consent. Never log message bodies.

Payment is a separate later adapter. Do not conflate enquiry state with payment
or order state. An opportunity in GHL is not proof of paid inventory.

## Future events

enquiry_prepared, whatsapp_opened, instagram_opened, call_opened. A later server
may emit enquiry_received after successful persistence. No purchase event until
verified payment. No tracking is installed now.
