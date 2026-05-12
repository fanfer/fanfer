const matter = require('gray-matter');
const yaml = require('js-yaml');

function parseFrontmatter(content) {
  const result = matter(content);
  return { data: result.data, content: result.content };
}

function stringifyFrontmatter(data, content) {
  return matter.stringify(content || '', data);
}

function parseYaml(raw) {
  return yaml.load(raw);
}

function stringifyYaml(data) {
  return yaml.dump(data, { indent: 2, lineWidth: -1, noRefs: true });
}

module.exports = { parseFrontmatter, stringifyFrontmatter, parseYaml, stringifyYaml };
