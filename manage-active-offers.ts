import fetch from 'node-fetch';
import * as bonds from 'fbonds-core'
import {UPDATE_TIME, rpcUrl, seedArray, maxLtv} from './config';
import { calculateFee, daysSinceTimestamp} from './helpers';


export async function terminateLoan(): Promise<void> {

    let seed = Uint8Array.from(seedArray)
        .slice(0,32);

    const keypair = bonds.anchor.web3.Keypair.fromSeed(seed);
    const programId = new bonds.anchor.web3.PublicKey('4tdmkuY6EStxbS6Y8s5ueznL3VPMSugrvQuDeAHGZhSt')
    
    const perpetuals = bonds.fbonds.functions.perpetual
    const conn = new bonds.anchor.web3.Connection(rpcUrl)
    
    const lendingStats = await (await fetch(
        `https://api.banx.gg/loans/lender/${keypair.publicKey.toBase58()}?order=desc&skip=0&limit=10&getAll=true&isPrivate=false`,
        {
            method: 'GET',
        }
    )).json()

    const activeOffers = lendingStats.data.nfts
    
    let instructions: any  = []

    for(const order of activeOffers) {
        console.log('---------------------------------------------------------------------------------------')
        const amount = order.bondTradeTransaction.solAmount/bonds.anchor.web3.LAMPORTS_PER_SOL
        const APR = order.bondTradeTransaction.amountOfBonds/100
        const days = daysSinceTimestamp(order.bondTradeTransaction.soldAt)

        const fee = calculateFee(amount, APR, days)

        const collectionFloor = order.nft.collectionFloor/bonds.anchor.web3.LAMPORTS_PER_SOL
        const nftName = order.nft.meta.name
        const ltv = (amount+fee)/collectionFloor

        console.log(`${nftName} LTV: ${(ltv*100).toFixed(0)}`)

        if(ltv>=maxLtv){
            console.log(`Terminating loan. LTV too high!!`)
            const txIx= await perpetuals.terminatePerpetualLoan({
                programId: programId,
                connection: conn,
                accounts: {
                    bondTradeTransactionV2: new bonds.anchor.web3.PublicKey(order.bondTradeTransaction.publicKey),
                    fbond: new bonds.anchor.web3.PublicKey(order.fraktBond.publicKey),
                    userPubkey: keypair.publicKey
                },
                optimistic: {
                    fraktBond: {
                        fraktBondState: order.fraktBond.fraktBondState,
                        bondTradeTransactionsCounter: order.fraktBond.bondTradeTransactionsCounter,
                        borrowedAmount: order.fraktBond.borrowedAmount,
                        banxStake: order.fraktBond.banxStake,
                        fraktMarket: order.fraktBond.fraktMarket,
                        hadoMarket: order.fraktBond.hadoMarket,
                        amountToReturn: order.fraktBond.amountToReturn,
                        actualReturnedAmount: order.fraktBond.actualReturnedAmount,
                        terminatedCounter: order.fraktBond.terminatedCounter,
                        fbondTokenMint: order.fraktBond.fbondTokenMint,
                        fbondTokenSupply: order.fraktBond.fbondTokenSupply,
                        activatedAt: order.fraktBond.activatedAt,
                        liquidatingAt: order.fraktBond.liquidatingAt,
                        fbondIssuer: order.fraktBond.fbondIssuer,
                        repaidOrLiquidatedAt: order.fraktBond.repaidOrLiquidatedAt,
                        currentPerpetualBorrowed: order.fraktBond.currentPerpetualBorrowed,
                        lastTransactedAt: order.fraktBond.lastTransactedAt,
                        refinanceAuctionStartedAt: order.fraktBond.refinanceAuctionStartedAt,
                        publicKey: order.fraktBond.publicKey,
                    },
                    bondTradeTransaction: {
                        bondTradeTransactionState: order.bondTradeTransaction.bondTradeTransactionState,
                        bondOffer: order.bondTradeTransaction.bondOffer,
                        user: order.bondTradeTransaction.user,
                        amountOfBonds: order.bondTradeTransaction.amountOfBonds,
                        solAmount: order.bondTradeTransaction.solAmount,
                        feeAmount: order.bondTradeTransaction.feeAmount,
                        bondTradeTransactionType: order.bondTradeTransaction.bondTradeTransactionType,
                        fbondTokenMint: order.bondTradeTransaction.fbondTokenMint,
                        soldAt: order.bondTradeTransaction.soldAt,
                        redeemedAt: order.bondTradeTransaction.redeemedAt,
                        redeemResult: order.bondTradeTransaction.redeemResult,
                        seller: order.bondTradeTransaction.seller,
                        isDirectSell: order.bondTradeTransaction.isDirectSell,
                        publicKey: order.bondTradeTransaction.publicKey,
                    }
                }
                
            })
            for(const ix of txIx.instructions){
                instructions.push(ix)
            }
        }        
    }
    if(instructions.length > 0){
        if(instructions.length > 4){
            console.log(`Tx too big! Doing severeal txs.`)
            sendMultipleTx(instructions)
        }else{
            const transaction = new bonds.web3.Transaction()
            for(const ix of instructions){
                transaction.add(ix);
            }
            const sig = await conn.sendTransaction(transaction, [keypair]);
            console.log(`Terminate loan TX: https://solscan.io/tx/${sig}`)
        }

    }
    console.log(`Checking again in ${UPDATE_TIME} min...`)
    
    async function sendMultipleTx(instructions: any): Promise<void> {
        const chunkSize = 4;
        for (let i = 0; i < instructions.length; i += chunkSize) {
            const chunk = instructions.slice(i, i + chunkSize);
    
            // Perform your logic here on the 'chunk' of objects
            const transaction = new bonds.web3.Transaction()
            for(const ix of chunk){
                transaction.add(ix);
            }
            const sig = await conn.sendTransaction(transaction, [keypair]);
            console.log(`Terminate loan TX: https://solscan.io/tx/${sig}`)
        }
    }
}

