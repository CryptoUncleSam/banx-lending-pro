
import { terminateLoan } from "./manage-active-offers";
import { sleep } from "./helpers";
import { UPDATE_TIME } from "./config";


async function index(){
    while (true) {
        try{
            await terminateLoan()
        }catch (err) {
            console.log(err)
        }
        await sleep(1000*60*UPDATE_TIME)
    }
}

index()

