// import * as anchor from "@project-serum/anchor";
// import { Program, web3 } from "@project-serum/anchor";
// import { assert } from "chai";
// import { PublicKey, SYSVAR_RENT_PUBKEY, SystemProgram } from "@solana/web3.js";
// import { TOKEN_PROGRAM_ID, ASSOCIATED_TOKEN_PROGRAM_ID, getAccount, getAssociatedTokenAddress } from "@solana/spl-token";
// // import { METADATA_PROGRAM_ID } from "@metaplex-foundation/mpl-token-metadata";
// import BN from "bn.js";

// describe("Test Minter", () => {
//     const TOKEN_METADATA_PROGRAM_ID = new web3.PublicKey(
//         "31jqEsAMH9gArsvMVbNSTz18R9sVttif3m2w5oUHLFyU"
//       );
//   // Anchor setup
//   const provider = anchor.AnchorProvider.env();
//   anchor.setProvider(provider);
//   const program = anchor.workspace.TokenMinter as Program<any>;

//   // Metaplex Constants
//   const METADATA_SEED = "metadata";

//   // Constants from our program
//   const MINT_SEED = "mint";

//   // Data for our tests
//   const payer = provider.wallet.publicKey;
//   const metadata = {
//     name: "Just a Test Token",
//     symbol: "TEST",
//     uri: "https://5vfxc4tr6xoy23qefqbj4qx2adzkzapneebanhcalf7myvn5gzja.arweave.net/7UtxcnH13Y1uBCwCnkL6APKsge0hAgacQFl-zFW9NlI",
//     decimals: 9,
//   };
//   const mintAmount = 10;

//   const [mint] = PublicKey.findProgramAddressSync(
//     [Buffer.from(MINT_SEED)],
//     program.programId
//   );

//   const [metadataAddress] = PublicKey.findProgramAddressSync(
//     [
//       Buffer.from(METADATA_SEED),
//       mint.toBuffer(),
//       TOKEN_METADATA_PROGRAM_ID.toBuffer(),
//     ],
//     TOKEN_METADATA_PROGRAM_ID
//   );

//   // Test init token
//   it("initialize", async () => {
//     const info = await provider.connection.getAccountInfo(mint);
//     if (info) {
//       console.log("Mint already initialized.");
//       return; // Do not attempt to initialize if already initialized
//     }
//     console.log("Mint not found. Attempting to initialize.");

//     const context = {
//       metadata: metadataAddress,
//       mint,
//       payer,
//       rent: SYSVAR_RENT_PUBKEY,
//       tokenProgram: TOKEN_PROGRAM_ID,
//       tokenMetadataProgram: TOKEN_METADATA_PROGRAM_ID,
//       systemProgram: SystemProgram.programId,
//     };

//     const tx = await program.methods
//       .initToken(metadata)
//       .accounts(context)
//       .rpc();

//     console.log(`Transaction: https://explorer.solana.com/tx/${tx}?cluster=devnet`);

//     const newInfo = await provider.connection.getAccountInfo(mint);
//     assert(newInfo, "Mint should be initialized.");
//   });

//   // Test mint tokens
//   it("mint tokens", async () => {
//     const destination = await getAssociatedTokenAddress(mint, payer);

//     let initialBalance: number;
//     try {
//       const accountInfo = await getAccount(provider.connection, destination);
//       initialBalance = Number(accountInfo.amount) / 10 ** metadata.decimals;
//     } catch {
//       // Token account not yet initiated, assume 0 balance
//       initialBalance = 0;
//     }

//     const context = {
//       mint,
//       destination,
//       payer,
//       rent: SYSVAR_RENT_PUBKEY,
//       systemProgram: SystemProgram.programId,
//       tokenProgram: TOKEN_PROGRAM_ID,
//       associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
//     };

//     const tx = await program.methods
//       .mintTokens(new BN(mintAmount * 10 ** metadata.decimals))
//       .accounts(context)
//       .rpc();

//     console.log(`Transaction: https://explorer.solana.com/tx/${tx}?cluster=devnet`);

//     const postBalanceAccount = await getAccount(provider.connection, destination);
//     const postBalance = Number(postBalanceAccount.amount) / 10 ** metadata.decimals;

//     assert.equal(
//       initialBalance + mintAmount,
//       postBalance,
//       "Post balance should equal initial plus mint amount"
//     );
//   });
// });

import * as anchor from "@coral-xyz/anchor";
import { Program, BN, web3 } from "@coral-xyz/anchor";
import {
  Keypair,
  LAMPORTS_PER_SOL,
  PublicKey,
  SystemProgram,
  Transaction,
  SYSVAR_RENT_PUBKEY
} from "@solana/web3.js";
import b58 from "bs58"
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

describe("token_minter", () => {
  anchor.setProvider(anchor.AnchorProvider.env());

  const provider = anchor.getProvider();
  const payer = anchor.AnchorProvider.env().wallet.publicKey;


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
  const main_wallet = Keypair.generate()
  const main_wallet_publicKey = Keypair.generate()

  console.log('main_wallet_publicKey', main_wallet_publicKey);
  const nuc_token = Keypair.generate();
  console.log('nuc_token', nuc_token);
  const MINT_SEED = "mint";
  const accountsPublicKeys = {
    main_wallet: main_wallet.publicKey,
    nuc_token: nuc_token.publicKey,
    associatedTokenprogram: ASSOCIATED_TOKEN_PROGRAM_ID,

    tokenProgram: TOKEN_PROGRAM_ID,

    systemProgram: SystemProgram.programId,
  };
  const METADATA_SEED = "metadata";
  const [mint] = PublicKey.findProgramAddressSync(
    [Buffer.from(MINT_SEED)],
    program.programId
  );
  const TOKEN_METADATA_PROGRAM_ID = new web3.PublicKey(
    "31jqEsAMH9gArsvMVbNSTz18R9sVttif3m2w5oUHLFyU"
  );
  const [metadataAddress] = PublicKey.findProgramAddressSync(
    [
      Buffer.from(METADATA_SEED),
      mint.toBuffer(),
      TOKEN_METADATA_PROGRAM_ID.toBuffer(),
    ],
    TOKEN_METADATA_PROGRAM_ID
  );

  it("setup", async () => {
    let lamports = await getMinimumBalanceForRentExemptMint(connection);
    let tx = new Transaction();
    tx.instructions = [
      SystemProgram.transfer({
        fromPubkey: provider.publicKey,
        toPubkey: main_wallet.publicKey,
        lamports: 10 * LAMPORTS_PER_SOL,
      }),
      SystemProgram.createAccount({
        fromPubkey: provider.publicKey,
        newAccountPubkey: nuc_token.publicKey,
        lamports,
        space: MINT_SIZE,
        programId: TOKEN_PROGRAM_ID,
      }),
    ];
    await provider.sendAndConfirm(tx, [nuc_token, main_wallet]).then(log);
  });

  it("Token Mint", async () => {
    const accounts = {
      metadata: metadataAddress,
      mint,
      payer,
      rent: SYSVAR_RENT_PUBKEY,
      tokenProgram: TOKEN_PROGRAM_ID,
      tokenMetadataProgram: TOKEN_METADATA_PROGRAM_ID,
      systemProgram: SystemProgram.programId,
    };

    const metadata = {
      name: "Just a Test Token",
      symbol: "TEST",
      uri: "https://5vfxc4tr6xoy23qefqbj4qx2adzkzapneebanhcalf7myvn5gzja.arweave.net/7UtxcnH13Y1uBCwCnkL6APKsge0hAgacQFl-zFW9NlI",
      decimals: 9,
    };
    await program.methods
      .initToken(metadata)
      .accounts({ ...accounts })
      .signers([nuc_token])
      .rpc()
      .then(confirm)
      .then(log);
  });
});
