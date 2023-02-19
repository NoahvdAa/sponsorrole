const SPONSORING_QUERY = `
query { 
  me {
    memberOf(role: BACKER) {
      nodes {
        account {
          slug
        }
      }
    }
  } 
}
`;

export async function getSponsoring(token) {
    let response = await fetch('https://opencollective.com/api/graphql/v2', {
        method: 'POST',
        body: JSON.stringify({
            query: SPONSORING_QUERY
        }),
        headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
            'User-Agent': 'https://github.com/NoahvdAa/sponsorrole'
        }
    });

    let {data} = await response.json();
    let {me} = data;

    return me.memberOf.nodes.map((org) => org.account.slug);
}
