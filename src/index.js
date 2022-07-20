const github = require('@actions/github')
const core = require('@actions/core');
const { Octokit } = require('@octokit/rest')
const slack = require('slack-notify')(core.getInput('webhook_url'));

const token = core.getInput('github_token')
const octokit = new Octokit({ auth: token })
const { repo, payload: { pull_request, workflow_run } } = github.context

function capitalize(str) {
  return str[0].toUpperCase() + str.split('').slice(1).join('')
}

async function slackFailedMessage(source, target) {
  if (!core.getInput('webhook_url')) return;
  slack.send({
    icon_emoji: ":red_circle:",
    username: `*${source}* has a merge conflict with *${target}*.`,
    attachments: [
        {
            author_name: github.context.payload.repository.full_name,
            author_link: workflow_run.url,
            title: `*${capitalize(source)}* has a merge conflict with *${target}*.`,
            text: `"${pull_request.title}" has conflicts with ${target} that must be resolved.`,
            fields: [
                { title: 'Merge Status', value: 'failed', short: false },
                { title: 'PR Number', value: pull_request.number, short: false },
                { title: 'Author', value: pull_request.user.login, short: false },
            ],
        },
    ],
  });
}

async function merge(source, target) {
  await octokit.repos.merge({
    owner: repo.owner,
    repo: repo.repo,
    base: target,
    head: source,
    commit_message: `Merged '${source}' into '${target}'.`
  })
}

async function run() {
  core.info(`version: 1.2.0`)
  core.info(JSON.stringify(github))

  const source = core.getInput('source')
  const target = core.getInput('target')
  core.info(`merge ${source} into ${target}`)

  try {
    await merge(source, target)
  } catch (error) {
    await slackFailedMessage(source, target)
    core.setFailed(`${source} merge failed: ${error.message}`)
  }
}

run()
