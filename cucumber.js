const common = [
  'features/**/*.feature',
  '--require support/**/*.js',
  '--require step_definitions/**/*.js',
  '--format progress-bar',
  '--format html:reports/cucumber-report.html',
  '--format summary',
].join(' ');

module.exports = {
  default: common,
};
