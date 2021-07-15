import { expect } from "chai";
import fs from "fs-extra";
import tmp from "tmp";
import GitRepo from "../utils/git_repo";
import { execCliCommand } from "../utils/misc";

describe("Validate tests", function () {
  let tmpDir: tmp.DirResult;
  let repo: GitRepo;
  this.beforeEach(() => {
    tmpDir = tmp.dirSync();
    repo = new GitRepo(tmpDir.name);
    repo.createChangeAndCommit("1");
  });
  afterEach(() => {
    fs.emptyDirSync(tmpDir.name);
    tmpDir.removeCallback();
  });
  this.timeout(5000);

  it("Can pass validation", () => {
    repo.createChange("2");
    execCliCommand(`diff -b "a" -s`, { fromDir: tmpDir.name });
    repo.createChange("3");
    execCliCommand(`diff -b "b" -s`, { fromDir: tmpDir.name });

    // Expect this command not to fail.
    execCliCommand("validate -s", { fromDir: tmpDir.name });
  });

  it("Can fail validation", () => {
    const tmpDir = tmp.dirSync();
    const repo = new GitRepo(tmpDir.name);

    repo.createChangeAndCommit("1");
    repo.createAndCheckoutBranch("a");
    repo.createChangeAndCommit("2");
    repo.createAndCheckoutBranch("b");
    repo.createChangeAndCommit("3");

    // Expect this command to fail for having no meta.
    expect(() => {
      execCliCommand("validate -s", { fromDir: tmpDir.name });
    }).to.throw;
  });
});
