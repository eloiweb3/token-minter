import * as anchor from "@coral-xyz/anchor";
import { Program, BN } from "@coral-xyz/anchor";
import {
  Keypair,
  LAMPORTS_PER_SOL,
  PublicKey,
  SystemProgram,
  Transaction,
} from "@solana/web3.js";
import {
  ASSOCIATED_TOKEN_PROGRAM_ID,
  MINT_SIZE,
  TOKEN_PROGRAM_ID,
  createAssociatedTokenAccountIdempotentInstruction,
  createInitializeMint2Instruction,
  createMintToInstruction,
  getAssociatedTokenAddressSync,
  getMinimumBalanceForRentExemptMint,
} from "@solana/spl-token";

import { TokenMinter } from "../target/types/token_minter";

describe("NFT_mint", () => {
  anchor.setProvider(anchor.AnchorProvider.env());

  const provider = anchor.getProvider();

  const connection = provider.connection;

  const program = anchor.workspace.TokenMinter as Program<TokenMinter>;

  const confirm = async (signature: string): Promise<string> => {
    const block = await connection.getLatestBlockhash();
    await connection.confirmTransaction({
      signature,
      ...block,
    });
    return signature;
  };

  const log = async (signature: string): Promise<string> => {
    console.log(
      `Your transaction signature: https://explorer.solana.com/transaction/${signature}?cluster=custom&customUrl=${connection.rpcEndpoint}`
    );
    return signature;
  };

  // Accounts
  const eloi_wallet = Keypair.generate();
  const user = Keypair.generate();

  const mint = PublicKey.findProgramAddressSync(
    [Buffer.from("mint", "utf-8")],
    program.programId
  )[0];

  const metadata = {
    name: "Just a Test Token",
    symbol: "TEST",
    uri: "https://5vfxc4tr6xoy23qefqbj4qx2adzkzapneebanhcalf7myvn5gzja.arweave.net/7UtxcnH13Y1uBCwCnkL6APKsge0hAgacQFl-zFW9NlI",
    decimals: 9,
  };

  const accountsPublicKeys = {
    eloi_wallet: eloi_wallet?.publicKey,
    user: user?.publicKey,
    mint,
    associatedTokenprogram: ASSOCIATED_TOKEN_PROGRAM_ID,

    tokenProgram: TOKEN_PROGRAM_ID,

    systemProgram: SystemProgram.programId,
  };

  it("setup", async () => {
    let lamports = await getMinimumBalanceForRentExemptMint(connection);
    let tx = new Transaction();
    tx.instructions = [
      SystemProgram.transfer({
        fromPubkey: provider?.publicKey,
        toPubkey: eloi_wallet?.publicKey,
        lamports: 10 * LAMPORTS_PER_SOL,
      }),
      SystemProgram.transfer({
        fromPubkey: provider?.publicKey,
        toPubkey: user?.publicKey,
        lamports: 10 * LAMPORTS_PER_SOL,
      }),
      ,
    ];

     provider.sendAndConfirm(tx, [ eloi_wallet, user]).then(log);
  });

  it("initToken", async () => {
    const accounts = {
      metadata: accountsPublicKeys["token_minter"],
      mint: accountsPublicKeys["mint"],
      payer: accountsPublicKeys["user"],
      rent: accountsPublicKeys["user"],
      systemProgram: accountsPublicKeys["system_program"],
      tokenMetadataProgram: accountsPublicKeys["token_minter"],
      tokenProgram: accountsPublicKeys["token_program"],
    };
     program.methods
      .initToken(metadata)
      .accounts({ ...accounts })
      .signers([user])
      .rpc()
      .then(confirm)
      .then(log);
  });
});
