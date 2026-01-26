# CDK code generation missing Get and ListBy resolvers

**Issue:** https://github.com/com-oneredboot/orb-schema-generator/issues/80

## Summary

`orb-schema-generator` v0.19.1 generates VTL resolver files for `*Get` and `*ListBy*` queries but does not generate the corresponding CDK code to attach them to AppSync.

## Environment

- orb-schema-generator version: 0.19.1
- Affected project: orb-integration-hub

## Problem

The generator creates:
- GraphQL schema with `OrganizationsGet`, `OrganizationsListByOwnerId`, etc.
- VTL files: `Query.OrganizationsGet.request.vtl`, `Query.OrganizationsListByOwnerId.request.vtl`, etc.

But the generated `api.py` only includes:
- Mutations: `OrganizationsCreate`, `OrganizationsUpdate`, `OrganizationsDelete`
- Queries: `OrganizationsQueryByOwnerId`, `OrganizationsQueryByStatus` (old naming)

**Missing from CDK code:**
- `OrganizationsGet`
- `OrganizationsDisable`
- `OrganizationsListByOwnerId`
- `OrganizationsListByOrganizationId`
- `OrganizationsListByOwnerIdAndCreatedAt`
- `OrganizationsListByStatus`
- `OrganizationsListByStatusAndCreatedAt`

This affects all tables, not just Organizations.

## Impact

- Queries defined in schema return null (no resolver attached)
- Frontend `getOrganization(id)` calls fail silently
- Create-on-click pattern broken (can create but can't fetch)

## Expected Behavior

Generated `api.py` should include resolver attachments for all queries defined in the schema, using the v0.19.0 naming convention (`*Get`, `*ListBy*`).

## Workaround

Manually add missing resolvers to `api.py` and redeploy.
