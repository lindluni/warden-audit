const fs = require('fs')
const core = require('@actions/core')
const {Octokit} = require("@octokit/rest")
const {retry} = require("@octokit/plugin-retry");
const {throttling} = require("@octokit/plugin-throttling");
const {enterpriseServer30Admin} = require("@octokit/plugin-enterprise-server");

const _Octokit = Octokit.plugin(enterpriseServer30Admin, retry, throttling);

(async function main() {
    try {
        const token = core.getInput('TOKEN', {required: true, trimWhitespace: true})
        const url = core.getInput('URL', {required: true, trimWhitespace: true})
        const user = core.getInput('USER', {required: true, trimWhitespace: true})

        let client
        try {
            client = new _Octokit({
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
        } catch (e) {
            fail(`Failed creating client: ${e}`)
        }

        let impersonationToken
        try {
            core.info(`Creating impersonation token for user: ${user}`)
            impersonationToken = await client.request('POST /admin/users/{username}/authorizations', {
                username: user,
                scopes: [
                    'repo'
                ]
            })
        } catch (e) {
            fail(`Failed generating impersonation token: ${e}`)
        }

        try {
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
        } catch (e) {
            fail(`Failed creating client: ${e}`)
        }

        const access = {
            orgs: [],
            repos: []
        }

        let orgs
        try {
            core.info(`Fetch orgs for user`)
            orgs = await client.paginate(client.orgs.listForAuthenticatedUser, {
                per_page: 100
            })
            for (const org of orgs) {
                access.orgs.push(org.login)
            }
        } catch (e) {
            fail(`Failed fetching user orgs: ${e}`)
        }

        let repos
        try {
            core.info(`Fetch repos for user`)
            repos = await client.paginate(client.repos.listForAuthenticatedUser, {
                per_page: 100
            })
            for (const repo of repos) {
                access.repos.push({
                    name: repo.full_name,
                    permission: repo.permissions
                })
            }
        } catch (e) {
            fail(`Failed fetching repos: ${e}`)
        }
        core.info('Writing file to disk')
        try {
            await fs.writeFileSync('audit-log.json', JSON.stringify(access))
        } catch (e) {
            fail(`Failed writing file to disk: ${e}`)
        }
        core.info(JSON.stringify(access))
    } catch (e) {
        core.error(`Unable to retrieve input: ${e}`)
    }
})()

function fail(error) {
    core.setFailed(error)
    process.exit(1)
}
