const path = require("path");
const execa = require("execa");
const getWritableDirectory = require("@now/build-utils/fs/get-writable-directory.js");
const download = require("@now/build-utils/fs/download.js");
const glob = require("@now/build-utils/fs/glob.js");
const { createLambda } = require("@now/build-utils/lambda.js");
const downloadAndInstallPip = require("./download-and-install-pip");
const Promise = require("bluebird");
const readFile = Promise.promisify(require("fs").readFile);

async function pipInstall(pipPath, srcDir, ...args) {
  console.log(`running "pip install -t ${srcDir} ${args.join(" ")}"...`);
  try {
    await execa(pipPath, ["install", "-t", srcDir, ...args], {
      stdio: "inherit"
    });
  } catch (err) {
    console.log(`failed to run "pip install -t ${srcDir} ${args.join(" ")}"`);
    throw err;
  }
}

exports.config = {
  maxLambdaSize: "10mb"
};

exports.build = async ({ files, entrypoint, config }) => {
  console.log("config:", config);
  console.log("downloading files...");

  const srcDir = await getWritableDirectory();

  // eslint-disable-next-line no-param-reassign
  files = await download(files, srcDir);

  // this is where `pip` will be installed to
  // we need it to be under `/tmp`
  const pyUserBase = await getWritableDirectory();
  process.env.PYTHONUSERBASE = pyUserBase;

  const pipPath = await downloadAndInstallPip();

  const { dependenciesFile = "requirements.txt" } = config;

  if (files[dependenciesFile]) {
    console.log(`found ${dependenciesFile}`);

    const requirementsTxtPath = files[dependenciesFile].fsPath;
    await pipInstall(pipPath, srcDir, "-r", requirementsTxtPath);
  } else {
    console.log(`did not find dependencies file ${dependenciesFile}`);
  }

  // will be used on `from $here import handler`
  // for example, `from api.users import handler`
  console.log("entrypoint is", entrypoint);

  const outputFiles = await glob("**", srcDir);

  const serverlessConfigFile = await readFile(path.join(srcDir, entrypoint));
  const serverlessConfig = JSON.parse(serverlessConfigFile);

  const lambdas = await Promise.map(
    Object.entries(serverlessConfig.functions),
    ([key, value]) => {
      return createLambda({
        files: outputFiles,
        handler: `${path.dirname(entrypoint)}/${value.handler}`,
        runtime: "python3.7",
        environment: {}
      }).then(lambda => {
        return { [value.entrypoint]: lambda };
      });
    }
  );

  return Object.assign({}, ...lambdas);
};
