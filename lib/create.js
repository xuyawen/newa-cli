const fs = require("fs-extra");
const path = require("path");
const chalk = require("chalk");
const inquirer = require("inquirer");
const PromptAPI = require("./promptAPI");
const Creator = require("./creator");
const Generator = require("./generator");
const clearConsole = require("./utils/clearConsole");
const { savePreset, rcPath } = require("./utils/options");
const { log } = require("./utils/logger");
const { saveOptions } = require("./utils/options");
const PackageManager = require("./PackageManager");

async function create(name) {
  const targetDir = path.join(process.cwd(), name);
  // 如果目标目录已存在，询问是覆盖还是合并
  if (fs.existsSync(targetDir)) {
    clearConsole();

    const { action } = await inquirer.prompt(
      require("./prompts/dir")(chalk.cyan(targetDir))
    );

    if (action === "overwrite") {
      log(`\nRemoving ${chalk.cyan(targetDir)}...`);
      await fs.remove(targetDir);
    }
  }

  const creator = new Creator();
  // 获取各个模块的交互提示语
  const prompts = getAllPrompts();
  const promptAPI = new PromptAPI(creator);
  prompts.forEach((m) => m(promptAPI));

  // 清空控制台
  clearConsole();

  // 弹出交互提示语并获取用户的选择
  const answers = await inquirer.prompt(creator.getFinalPrompts());

  if (answers.preset !== "__manual__") {
    const preset = creator.getPresets()[answers.preset];
    Object.keys(preset).forEach((key) => (answers[key] = preset[key]));
  }

  if (answers.packageManager) {
    saveOptions({ packageManager: answers.packageManager });
  }

  if (
    answers.save &&
    answers.saveName &&
    savePreset(answers.saveName, answers)
  ) {
    log();
    log(
      `Preset ${chalk.yellow(answers.saveName)} saved in ${chalk.yellow(
        rcPath
      )}`
    );
  }

  const pm = new PackageManager(targetDir, answers.packageManager);

  // package.json 文件内容
  const pkg = {
    name,
    version: "0.1.0",
    dependencies: {},
    devDependencies: {},
  };

  const genarator = new Generator(pkg, targetDir);
  // 填入 vue webpack 必选项，无需用户选择
  answers.features.unshift("vue", "webpack");

  // 根据用户选择的选项加载相应的模块，在 package.json 写入对应的依赖项
  // 并且将对应的 template 模块渲染
  answers.features.forEach((feature) =>
    require(`./generator/${feature}`)(genarator, answers)
  );

  await genarator.generate();

  // 下载依赖项
  await pm.install();
  log("\n依赖下载完成! 执行下列命令开始开发：\n");
  log(`cd ${name}`);
  log(`${pm.bin === "npm" ? "npm run" : "yarn"} dev`);
}

function getAllPrompts() {
  return ["babel", "router", "vuex", "linter"].map((file) =>
    require(`./prompts/${file}`)
  );
}

module.exports = create;
