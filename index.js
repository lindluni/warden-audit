const core = require('@actions/core')
const {Octokit} = require("@octokit/rest")
const {retry} = require("@octokit/plugin-retry");
const {throttling} = require("@octokit/plugin-throttling");
const {enterpriseServer30Admin} = require("@octokit/plugin-enterprise-server");

const _Octokit = Octokit.plugin(enterpriseServer30Admin, retry, throttling);

(async function main() {
    const token = core.getInput('TOKEN', {required: true, trimWhitespace: true})
    const url = core.getInput('URL', {required: true, trimWhitespace: true})

    let client = new _Octokit({
        auth: token,
        baseUrl: url,
        throttle: {
            onRateLimit: (retryAfter, options, octokit) => {
                octokit.log.warn(`Request quota exhausted for request ${options.method} ${options.url}`);
                if (options.request.retryCount === 0) {
                    octokit.log.info(`Retrying after ${retryAfter} seconds!`);
                    return true;
                }
            },
            onAbuseLimit: (retryAfter, options, octokit) => {
                octokit.log.warn(`Abuse detected for request ${options.method} ${options.url}`);
            },
        }

    })

    console.log(process.env)
    const impersonationToken = await client.request('POST /admin/users/{username}/authorizations', {
        username: process.env.USER,
        scopes: [
            'repo'
        ]
    })
    client = new _Octokit({
        auth: impersonationToken.data.token,
        baseUrl: url,
        throttle: {
            onRateLimit: (retryAfter, options, octokit) => {
                octokit.log.warn(`Request quota exhausted for request ${options.method} ${options.url}`);
                if (options.request.retryCount === 0) {
                    octokit.log.info(`Retrying after ${retryAfter} seconds!`);
                    return true;
                }
            },
            onAbuseLimit: (retryAfter, options, octokit) => {
                octokit.log.warn(`Abuse detected for request ${options.method} ${options.url}`);
            },
        }
    })
    const access = {
        orgs: [],
        repos: []
    }
    const orgs = await client.paginate(client.orgs.listForAuthenticatedUser, {
        per_page: 100
    })
    for (const org of orgs) {
        access.orgs.push(org.login)
    }
    const repos = await client.paginate(client.repos.listForAuthenticatedUser, {
        per_page: 100
    })
    for (const repo of repos) {
        access.repos.push({
            name: repo.full_name,
            permission: repo.permissions
        })
    }
    console.log(JSON.stringify(access))
})()
