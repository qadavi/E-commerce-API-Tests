const common = [
  'features/**/*.feature',
  '--require support/**/*.js',
  '--require step_definitions/**/*.js',
  '--format progress-bar',
  '--format html:reports/cucumber-report.html',
  '--format summary',
  '--retry 1',
  '--retry-tag-filter @rate-limit',
].join(' ');

module.exports = {
  default: common,
};
