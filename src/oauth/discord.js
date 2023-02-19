import {getSponsoring} from '../api/github';
import * as jose from 'jose';

export async function handleDiscordCallback(request, env, ctx, url) {
    let code = url.searchParams.get('code');
    if (!code) {
        return Response.redirect(env.BASE_URL, 302);
    }

    let params = new URLSearchParams({
        client_id: env.DISCORD_CLIENT_ID,
        client_secret: env.DISCORD_CLIENT_SECRET,
        grant_type: 'authorization_code',
        code,
        redirect_uri: `${env.BASE_URL}/cb/discord`
    });
    let response = await fetch('https://discord.com/api/v10/oauth2/token', {
        method: 'POST',
        body: params,
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded'
        }
    });

    let data = await response.json();
    let accessToken = data.access_token;

    if (!accessToken) {
        return Response.redirect(`${env.BASE_URL}/error`, 302);
    }

    let connections = await getConnections(accessToken);
    let githubAccounts = connections
        .filter((connection) => connection.type === 'github')
        .map((connection) => connection.name);

    if (githubAccounts.length === 0) {
        return Response.redirect(`${env.BASE_URL}/no-github`, 302);
    }

    let isSponsoringUs = false;
    for (let login of githubAccounts) {
        let sponsoring = await getSponsoring(env.GITHUB_AUTH_TOKEN, login, env.GITHUB_INCLUDE_ORGANIZATION_SPONSORS === 'true');
        if (!sponsoring.includes(env.GITHUB_ORG_NAME)) continue;

        isSponsoringUs = true;
        break;
    }

    if (isSponsoringUs) {
        let success = await setSponsorStatus(accessToken, env.DISCORD_CLIENT_ID, true, false);
        if (!success) {
            return Response.redirect(`${env.BASE_URL}/error`, 302);
        }

        return Response.redirect(`${env.BASE_URL}/thanks`, 302);
    }

    // they're not sponsoring via GitHub, set a cookie so we know their discord auth when they verify via OC
    let jwtSecret = jose.base64url.decode(env.JWT_SECRET);
    let jwt = await new jose.EncryptJWT({accessToken})
        .setProtectedHeader({alg: 'dir', enc: 'A128CBC-HS256'})
        .setIssuedAt()
        .setIssuer('sponsorrole')
        .setExpirationTime('1h')
        .encrypt(jwtSecret);

    return new Response(null, {
        status: 302,
        headers: {
            Location: `${env.BASE_URL}/no-github-sponsor`,
            'Set-Cookie': `auth=${jwt}; path=/; secure; HttpOnly; Max-Age=3600`
        }
    });
}

async function getConnections(accessToken) {
    let response = await fetch('https://discord.com/api/v10/users/@me/connections', {
        headers: {
            Authorization: `Bearer ${accessToken}`
        }
    });

    return await response.json();
}

export async function setSponsorStatus(accessToken, clientId, github, openCollective) {
    let response = await fetch(`https://discord.com/api/v10/users/@me/applications/${clientId}/role-connection`, {
        method: 'PUT',
        body: JSON.stringify({
            metadata: {
                github: github ? 1 : 0,
                opencollective: openCollective ? 1 : 0
            }
        }),
        headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
        }
    });

    return response.ok;
}
