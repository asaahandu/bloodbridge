# Donor matching model

BloodBridge currently uses `explainable-v1`, a deterministic ranking baseline. It records the
feature vector, score, rank, reasons, and later donation outcome on `DonorRequestActivity`.

## Safety boundary

Blood compatibility, the configured minimum donation interval, and the donor's maximum travel
distance are eligibility gates. A learned model must never override these gates. Clinical staff
remain responsible for final donor screening.

`DONATION_MIN_INTERVAL_DAYS` defaults to a conservative 112-day whole-blood interval. Confirm the
applicable national and blood-service policy before production and change the environment value if
required.

The travel-time value is a rough straight-line estimate using
`MATCHING_AVERAGE_TRAVEL_SPEED_KMH`; it is not live road routing.

## Training path

1. Keep `explainable-v1` in production while recording completed, no-show, and declined outcomes.
2. Export de-identified JSONL examples:

   `node scripts/export-matching-training-data.js > matching-training-data.jsonl`

   Check available sample counts without exporting rows:

   `npm run export:matching-training-data -- --summary`

3. Train a small learning-to-rank or gradient-boosted tree model on the numeric feature vector.
4. Split evaluation data by time, not randomly, so future requests are not leaked into training.
5. Compare successful-donation rate, no-show rate, distance, subgroup performance, and calibration
   against `explainable-v1`.
6. Shadow-score the learned model without changing donor order. Promote it only after clinical and
   operational review.

Do not upload names, phone numbers, locations, request references, or database identifiers to a
training provider. The exporter intentionally emits only numeric/category features and labels.

## Synthetic development dataset

Preview the deterministic dataset without changing MongoDB:

`npm run seed:matching-data`

Write it to the configured development database:

`npm run seed:matching-data -- --apply`

The seed contains one hospital, 20 donors spread across Yaoundé, 40 historical blood requests,
eight active requests, and labelled matching activities generated with the real
`explainable-v1` scorer. Re-running the apply command refreshes only activities attached to the
seeded request IDs. Push notifications are disabled on seed accounts so test matching does not
contact real providers.

All seed accounts use `BloodBridgeSeed123!` by default. Set `SEED_MATCHING_PASSWORD` before running
the command to use a different shared development password. The hospital email is
`hospital@seed.bloodbridge.example`; donor emails follow
`<player-name>@seed.bloodbridge.example`.

This synthetic dataset is useful for UI, endpoint, exporter, and training-pipeline tests. It must
not be treated as evidence that a learned model is safe or effective. Production training and
evaluation require real, de-identified outcomes plus clinical and operational review.
