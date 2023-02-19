import error from './html/error.html';
import noGithub from './html/no-github.html';
import noGithubSponsor from './html/no-github-sponsor.html';
import noOcSponsor from './html/no-oc-sponsor.html';
import thanks from './html/thanks.html';
import {handleDiscordCallback} from './oauth/discord';
import {handleOpenCollectiveCallback} from './oauth/opencollective';

export default {
    async fetch(request, env, ctx) {
        let url = new URL(request.url);

        switch (url.pathname) {
            case '/':
                return Response.redirect(`https://discord.com/oauth2/authorize?client_id=${env.DISCORD_CLIENT_ID}&redirect_uri=${env.BASE_URL}/cb/discord&response_type=code&scope=identify+connections+role_connections.write`, 302);
            case '/cb/discord':
                return await handleDiscordCallback(request, env, ctx, url);
            case '/cb/oc':
                return await handleOpenCollectiveCallback(request, env, ctx, url);
            case '/opencollective':
                return Response.redirect(`https://opencollective.com/oauth/authorize?client_id=${env.OPENCOLLECTIVE_CLIENT_ID}&redirect_uri=${env.BASE_URL}/cb/oc&response_type=code&scope=incognito`, 302);
            case '/error':
                return html(error);
            case '/no-github':
                return html(noGithub);
            case '/no-github-sponsor':
                return html(noGithubSponsor);
            case '/no-oc-sponsor':
                return html(noOcSponsor);
            case '/thanks':
                return html(thanks);
        }

        return new Response('404 Page not Found', {
            status: 404
        });
    }
};

function html(content) {
    return new Response(content, {
        headers: {
            'Content-Type': 'text/html'
        }
    });
}
