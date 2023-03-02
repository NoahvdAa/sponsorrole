const SPONSORING_QUERY = `
query($fetchOrgs: Boolean!) { 
  me {
    memberOf(role: BACKER) {
      nodes {
        account {
          slug
        }
      }
    }
    orgMemberOf: memberOf(accountType: ORGANIZATION) @include(if: $fetchOrgs) {
      nodes {
        account {
          memberOf(role: BACKER) {
            nodes {
              account {
                slug
              }
            }
          }
        }
      }
    }
  } 
}
`;

export async function getSponsoring(token, includeOrganizations) {
    let response = await fetch('https://opencollective.com/api/graphql/v2', {
        method: 'POST',
        body: JSON.stringify({
            query: SPONSORING_QUERY,
            variables: {
                fetchOrgs: includeOrganizations
            }
        }),
        headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
            'User-Agent': 'https://github.com/NoahvdAa/sponsorrole'
        }
    });

    let {data} = await response.json();
    let {me} = data;

    let sponsoring = me.memberOf.nodes.map((org) => org.account.slug);

    if (me.orgMemberOf) {
        me.orgMemberOf.nodes.forEach((org) => org.account.memberOf.nodes.forEach((org) => sponsoring.push(org.account.slug)))
    }

    return sponsoring;
}
