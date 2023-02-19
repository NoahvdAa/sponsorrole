import {parse} from 'cookie';
import * as jose from 'jose';
import {getSponsoring} from '../api/opencollective';
import {setSponsorStatus} from './discord';

export async function handleOpenCollectiveCallback(request, env, ctx, url) {
    let code = url.searchParams.get('code');
    if (!code) {
        return Response.redirect(`${env.BASE_URL}/opencollective`, 302);
    }

    let jwt = parse(request.headers.get('Cookie') || '').auth;
    if (!jwt) {
        // we need to auth first
        return Response.redirect(`${env.BASE_URL}/`, 302);
    }

    let jwtSecret = jose.base64url.decode(env.JWT_SECRET);
    let payload;
    try {
        payload = (await jose.jwtDecrypt(jwt, jwtSecret, {
            issuer: 'sponsorrole'
        })).payload;
    } catch (e) {
        // invalid auth
        return Response.redirect(`${env.BASE_URL}/`, 302);
    }

    let params = new URLSearchParams({
        client_id: env.OPENCOLLECTIVE_CLIENT_ID,
        client_secret: env.OPENCOLLECTIVE_CLIENT_SECRET,
        grant_type: 'authorization_code',
        code,
        redirect_uri: `${env.BASE_URL}/cb/oc`
    });
    let response = await fetch('https://opencollective.com/oauth/token', {
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

    let sponsoring = await getSponsoring(accessToken);

    if (sponsoring.includes(env.OPENCOLLECTIVE_COLLECTIVE_SLUG)) {
        let success = await setSponsorStatus(payload.accessToken, env.DISCORD_CLIENT_ID, false, true);
        if (!success) {
            return Response.redirect(`${env.BASE_URL}/error`, 302);
        }

        return Response.redirect(`${env.BASE_URL}/thanks`, 302);
    }

    return Response.redirect(`${env.BASE_URL}/no-oc-sponsor`, 302);
}
