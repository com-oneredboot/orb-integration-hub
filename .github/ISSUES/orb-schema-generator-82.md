# VTL Generator Creates Query Prefix for Disable Operations Instead of Mutation

## Summary

In v0.19.2, the VTL generator creates resolver files with `Query.*Disable` prefix, but the CDK generator correctly expects `Mutation.*Disable` prefix. This causes CDK synth to fail with file not found errors.

## Version

orb-schema-generator v0.19.2

## Expected Behavior

VTL files for Disable operations should be named:
- `Mutation.OrganizationsDisable.request.vtl`
- `Mutation.OrganizationsDisable.response.vtl`

## Actual Behavior

VTL files are generated as:
- `Query.OrganizationsDisable.request.vtl`
- `Query.OrganizationsDisable.response.vtl`

## Evidence

GraphQL schema correctly defines Disable as Mutation:
```graphql
type Mutation {
  OrganizationsDisable(input: OrganizationsDisableInput!): OrganizationsDisableResponse
}
```

CDK generator correctly expects Mutation prefix:
```python
organizations_data_source.create_resolver(
    "OrganizationsDisableResolver",
    type_name="Mutation",
    field_name="OrganizationsDisable",
    request_mapping_template=appsync.MappingTemplate.from_file(
        str(Path(__file__).parent / "resolvers/Mutation.OrganizationsDisable.request.vtl")
    ),
)
```

But VTL generator creates files with Query prefix:
```
Query.OrganizationsDisable.request.vtl
Query.OrganizationsDisable.response.vtl
```

## Error

```
RuntimeError: Error: ENOENT: no such file or directory, open '.../resolvers/Mutation.OwnershipTransferRequestsDisable.request.vtl'
```

## Impact

CDK synth fails, blocking deployment of any project using v0.19.2 with Disable operations.

## Affected Operations

All `*Disable` operations across all tables:
- OwnershipTransferRequestsDisable
- OrganizationsDisable
- NotificationsDisable
- PrivacyRequestsDisable
- ApplicationUsersDisable
- SmsRateLimitDisable
- OrganizationUsersDisable
- ApplicationRolesDisable
- RolesDisable
- ApplicationsDisable
- UsersDisable
