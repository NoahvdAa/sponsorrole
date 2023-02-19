const SPONSORING_QUERY = `
query($login: String!, $fetchOrgs: Boolean!) {
  user(login: $login) {
    organizations(first: 100) @include(if: $fetchOrgs) {
      nodes {
        sponsoring(first: 100) {
          nodes {
            ... on ProfileOwner {
              login
            }
          }
        }
      }
    }
    sponsoring(first: 100) {
      nodes {
        ... on ProfileOwner {
          login
        }
      }
    }
  }
}
`;

export async function getSponsoring(token, userLogin, includeOrganizations) {
    let response = await fetch('https://api.github.com/graphql', {
        method: 'POST',
        body: JSON.stringify({
            query: SPONSORING_QUERY,
            variables: {
                login: userLogin,
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
    let sponsoring = [];

    data.user.sponsoring.nodes.forEach((node) => sponsoring.push(node.login));
    if (includeOrganizations) {
        data.user.organizations.nodes.forEach((org) =>
            org.sponsoring.nodes.forEach((node) => sponsoring.push(node.login))
        );
    }

    // remove duplicates
    return sponsoring.filter((entry, index) => sponsoring.indexOf(entry) === index);
}
