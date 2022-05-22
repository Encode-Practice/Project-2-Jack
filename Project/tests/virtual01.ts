import { expect } from "chai";
// eslint-disable-next-line node/no-unpublished-import
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { ethers } from "hardhat";
// eslint-disable-next-line node/no-missing-import
import { CustomBallot, TeamGToken } from "../typechain";

const PROPOSALS = ["Proposal 1", "Proposal 2", "Proposal 3"];
const BASE_VOTE_POWER = 10;
const PROPOSAL_CHOSEN = [0, 1, 2];
const USED_VOTE_POWER = 5;
const ACCOUNTS_FOR_TESTING = 3;

function convertStringArrayToBytes32(array: string[]) {
  const bytes32Array = [];
  for (let index = 0; index < array.length; index++) {
    bytes32Array.push(ethers.utils.formatBytes32String(array[index]));
  }
  return bytes32Array;
}

describe("Test01", function () {
  let ballotContract: CustomBallot;
  let ballotFactory: any;
  let tokenContractFactory: any;
  let tokenContract: TeamGToken;
  let accounts: SignerWithAddress[];

  beforeEach(async () => {
    accounts = await ethers.getSigners();
    [ballotFactory, tokenContractFactory] = await Promise.all([ // promise is for syncronous 
      ethers.getContractFactory("CustomBallot"),  
      ethers.getContractFactory("TeamGToken"),
    ]);
    tokenContract = await tokenContractFactory.deploy();
    await tokenContract.deployed();
  });

  describe("when voting power is given", async () => {
    it("updates votes correctly", async () => {
      const preMintVotePower = await tokenContract.getVotes(
        accounts[1].address
      );
      expect(preMintVotePower).to.eq(0);
      const mintTx = await tokenContract.mint(
        accounts[1].address,
        ethers.utils.parseEther(BASE_VOTE_POWER.toFixed(18))
      );
      await mintTx.wait();
      const postMintVotePower = await tokenContract.getVotes(
        accounts[1].address
      );
      expect(postMintVotePower).to.eq(0);
      const delegateTx = await tokenContract
        .connect(accounts[1])
        .delegate(accounts[1].address);
      await delegateTx.wait();
      const postDelegateVotePower = await tokenContract.getVotes(
        accounts[1].address
      );
      expect(Number(ethers.utils.formatEther(postDelegateVotePower))).to.eq(
        BASE_VOTE_POWER
      );
      const historicVotePower = await tokenContract.getPastVotes(
        accounts[1].address,
        2
      );
      expect(Number(ethers.utils.formatEther(historicVotePower))).to.eq(0);
    });

    it("when snapshot is taken", async () => {
      ballotContract = await ballotFactory.deploy(
        convertStringArrayToBytes32(PROPOSALS),
        tokenContract.address
      );
      await ballotContract.deployed();
      const sid0 = await tokenContract.getCurrentSnapshotId();
      expect(Number(sid0)).to.eq(0);
      console.log("sid0: ", Number(sid0))
      const a0 = accounts[0]
      const tx = await tokenContract.snapshot();
      await tx.wait();
      const sid1 = await tokenContract.getCurrentSnapshotId();
      expect(Number(sid1)).to.eq(1);
      console.log('sid1: ', Number(sid1));      

      const mintTx = await tokenContract.mint(
        a0.address,
        ethers.utils.parseEther(BASE_VOTE_POWER.toFixed(18))
      );
      await mintTx.wait();
      const vbal = await ballotContract.votingPower(a0.address);
      console.log('Voting balance is: ', ethers.utils.formatEther(vbal));
      const vbal1 = ethers.utils.formatEther(vbal);
      const bal1 = await tokenContract.balanceOf(a0.address);
      const bal2 = Number(sid1)>=1 ? await tokenContract.balanceOfAt(a0.address, sid1) : vbal;
      const diff = bal1.sub(bal2);
      console.log('The diff is', ethers.utils.formatEther(diff));
      const diff2 = 3;
    });
  });
});
