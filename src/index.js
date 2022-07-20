const github = require('@actions/github')
const core = require('@actions/core');
const { Octokit } = require('@octokit/rest')
const slack = require('slack-notify')(core.getInput('webhook_url'));

const token = core.getInput('github_token')
const octokit = new Octokit({ auth: token })
const { actor: author, payload: { repository } } = github.context

function capitalize(str) {
  return str[0].toUpperCase() + str.split('').slice(1).join('')
}

async function slackFailedMessage(source, target, run_url) {
  if (!core.getInput('webhook_url')) return;
  slack.send({
    blocks: [
      {
        type: "section",
        text: {
          type: "mrkdwn",
          text: `:face_with_head_bandage: *${capitalize(source)}* has a merge conflict with *${target}*\nAuthor: *${author}*`
        },
      },
      {
        type: "button",
        text: {
          type: "plain_text",
          text: "View Run :mag:",
          emoji: true
        },
        url: run_url,
      }
    ],
  });
}

async function merge(source, target) {
  await octokit.repos.merge({
    owner: repository.owner.name,
    repo: repository.name,
    base: target,
    head: source,
    commit_message: `Merged '${source}' into '${target}'.`
  })
}

async function run() {
  core.info(`version: 1.3.1`)

  const source = core.getInput('source')
  const target = core.getInput('target')
  const run_url = core.getInput('run_url')

  core.info(`merge ${source} into ${target}`)

  try {
    await merge(source, target)
  } catch (error) {
    await slackFailedMessage(source, target, run_url)
    core.setFailed(`${source} merge failed: ${error.message}`)
  }
}

run()
