const github = require('@actions/github')
const core = require('@actions/core');
const { Octokit } = require('@octokit/rest')
const slack = require('slack-notify')(core.getInput('webhook_url'));

const token = core.getInput('github_token')
const octokit = new Octokit({ auth: token })
const repo = github.context.repo

async function slackFailedMessage(source, target) {
  if (!core.getInput('webhook_url')) return;
  slack.send({
    icon_emoji: ":red_circle:",
    username: `*${source}* has a merge conflict with *${target}*.`,
    attachments: [
        {
            author_name: github.context.payload.repository.full_name,
            author_link: `https://github.com/${github.context.payload.repository.full_name}/`,
            text: `*${source}* has a merge conflict with *${target}*.`,
            color: "#C0392A",
            fields: [
                { title: 'Job Status', value: 'failed', short: false },
            ],
        },
    ],
  });
}

async function merge(source, target) {
  core.info(`merge branch:${source} to: ${target}`)

  await octokit.repos.merge({
    owner: repo.owner,
    repo: repo.repo,
    base: target,
    head: source,
    commit_message: `Merged '${source}' into '${target}'.`
  })
}

async function run() {
  core.info(`version: 1.1.0`)

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
