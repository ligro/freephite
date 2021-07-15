import { expect } from "chai";
import fs from "fs-extra";
import tmp from "tmp";
import GitRepo from "../utils/git_repo";
import { execCliCommand } from "../utils/misc";

describe("Diff tests", function () {
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

  it("Can create a diff", () => {
    repo.createChange("2");

    execCliCommand(`diff -b "a" -s`, { fromDir: tmpDir.name });
    expect(repo.currentBranchName()).to.equal("a");

    execCliCommand("prev", { fromDir: tmpDir.name });
    expect(repo.currentBranchName()).to.equal("main");
  });
});
