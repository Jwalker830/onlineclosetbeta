import React from "react";
import { setDoc, doc, query, collection, where, getDocs } from "firebase/firestore";
import { db, auth, provider} from "../firebase-config";
import { signInWithPopup } from "firebase/auth";
import { useNavigate } from "react-router-dom";

function Login({ setIsAuth }){

    let navigate = useNavigate();

    const signInWithGoogle = () => {
        signInWithPopup(auth, provider).then((result) => {
            localStorage.setItem("isAuth", true);
            setIsAuth(true);
            addUser();
            navigate("/");
        })
    }

    const addUser = async () => {
        var exist = false;
        const q = query(collection(db, "users"), where("id", "==", auth.currentUser.uid));
        const data = await getDocs(q);
        data.forEach((doc) => {
            exist = true;
        })
        if(!exist){
            const noJacket = {
                id: "000",
                owner: auth.currentUser.uid,
                imgURL: "https://firebasestorage.googleapis.com/v0/b/onlinecloset-4f4d7.appspot.com/o/1200px-Gray_cross_out.svg.png?alt=media&token=f92fbec2-c903-4657-946d-17684ae49be3",
                title: "No Jacket",
                desc: "",
                tags: ["No Jacket"],
                type: "Jacket",
                following: [],
                followers: []
            }

            const noHat = {
                id: "001",
                owner: auth.currentUser.uid,
                imgURL: "https://firebasestorage.googleapis.com/v0/b/onlinecloset-4f4d7.appspot.com/o/1200px-Gray_cross_out.svg.png?alt=media&token=f92fbec2-c903-4657-946d-17684ae49be3",
                title: "No Hat",
                desc: "",
                tags: ["No Hat"],
                type: "Hat"
            }

            const noAcc = {
                id: "002",
                owner: auth.currentUser.uid,
                imgURL: "https://firebasestorage.googleapis.com/v0/b/onlinecloset-4f4d7.appspot.com/o/1200px-Gray_cross_out.svg.png?alt=media&token=f92fbec2-c903-4657-946d-17684ae49be3",
                title: "No Accessory",
                desc: "",
                tags: ["No Accessory"],
                type: "Accessory"
            }

            await setDoc(doc(db, "users", auth.currentUser.uid), {
                name: auth.currentUser.displayName,
                id: auth.currentUser.uid,
                items: [{id: noJacket.id}, {id: noHat.id}, {id: noAcc.id}],
                prefs: {
                    love: [],
                    like: [],
                    enjoy: [],
                    dislike: [],
                    hate: []
                },
                favOutFits: []
            });
            
        }
    }

    return <div className="loginPage">
        <p>Sign In With Google to Continue</p>
        <button className="login-with-google-btn" onClick={signInWithGoogle}>Sign in with Google</button>
    </div>;
}

export default Login;