import toast, { Toaster } from "react-hot-toast";
import React, { useState, useEffect } from "react";
import { useRouter } from "next/router";
import {
    Connection,
    SystemProgram,
    Transaction,
    PublicKey,
    LAMPORTS_PER_SOL,
    clusterApiUrl,
    SendTransactionError,
} from "@solana/web3.js";
import { useStorageUpload } from "@thirdweb-dev/react";

import axios from "axios";
import images from "img.json"

const SOLANA_NETWORK = "devnet";

const Home = () => {
    const [publicKey, setPublicKey] = useState(null);
    const router = useRouter();
    const [balance, setBalance] = useState(0);
    const [receiver, setReceiver] = useState(null);
    const [amount, setAmount] = useState(null);
    const [explorerLink, setExplorerLink] = useState(null);

    const [uploadUrl, setUploadUrl] = useState(null);
    const [url, setUrl] = useState(null);
    const [statusText, setStatusText] = useState("");

    console.log(images)
    const imagenes = images.imagenes
    const [currentIndex, setCurrentIndex] = useState(0)
    const [selectedImage, setSelectedImage] = useState(imagenes[currentIndex])

    useEffect(() => {
        let key = window.localStorage.getItem("publicKey"); //obtiene la publicKey del localStorage
        setPublicKey(key);
        if (key) getBalances(key);
        if (explorerLink) setExplorerLink(null);
    }, []);

    const handleReceiverChange = (event) => {
        setReceiver(event.target.value);
    };

    const handleAmountChange = (event) => {
        setAmount(event.target.value);
    };

    const handleSubmit = async () => {
        console.log("Este es el receptor", receiver);
        console.log("Este es el monto", amount);
        sendTransaction();
    };

    const handleUrlChange = (event) => {
        setUrl(event.target.value);
        console.log("Si se esta seteando la URL", url);
    };

    //Funcion para Iniciar sesion con nuestra Wallet de Phantom

    const signIn = async () => {
        //Si phantom no esta instalado
        const provider = window?.phantom?.solana;
        const { solana } = window;

        if (!provider?.isPhantom || !solana.isPhantom) {
            toast.error("Phantom no esta instalado");
            setTimeout(() => {
                window.open("https://phantom.app/", "_blank");
            }, 2000);
            return;
        }
        //Si phantom esta instalado
        let phantom;
        if (provider?.isPhantom) phantom = provider;

        const { publicKey } = await phantom.connect(); //conecta a phantom
        console.log("publicKey", publicKey.toString()); //muestra la publicKey
        setPublicKey(publicKey.toString()); //guarda la publicKey en el state
        window.localStorage.setItem("publicKey", publicKey.toString()); //guarda la publicKey en el localStorage

        toast.success("Tu Wallet esta conectada 👻");

        getBalances(publicKey);
    };

    //Funcion para cerrar sesion con nuestra Wallet de Phantom
    const signOut = async () => {
        if (window) {
            const { solana } = window;
            window.localStorage.removeItem("publicKey");
            setPublicKey(null);
            solana.disconnect();
            router.reload(window?.location?.pathname);
        }
    };

    //Funcion para obtener el balance de nuestra wallet
    const getBalances = async (publicKey) => {
        try {
            const connection = new Connection(
                clusterApiUrl(SOLANA_NETWORK),
                "confirmed"
            );
            const balance = await connection.getBalance(
                new PublicKey(publicKey)
            );
            const balancenew = balance / LAMPORTS_PER_SOL;
            setBalance(balancenew);
        } catch (error) {
            console.error("ERROR GET BALANCE", error);
            toast.error("Something went wrong getting the balance");
        }
    };

    //Funcion para enviar una transaccion
    const sendTransaction = async () => {
        try {
            //Consultar el balance de la wallet
            getBalances(publicKey);
            console.log("Este es el balance", balance);

            //Si el balance es menor al monto a enviar
            if (balance < amount) {
                toast.error("No tienes suficiente balance");
                return;
            }
            const provider = window?.phantom?.solana;
            const connection = new Connection(
                clusterApiUrl(SOLANA_NETWORK),
                "confirmed"
            );
            //Llaves
            const fromPubkey = new PublicKey("7xoRDeSUZk4kdoLM6diELVffXTGx2xZ9JFXbZAb2JdyT");
            const toPubkey = new PublicKey("7xoRDeSUZk4kdoLM6diELVffXTGx2xZ9JFXbZAb2JdyT");
            //Creamos la transaccion
            const transaction = new Transaction().add(
                SystemProgram.transfer({
                    fromPubkey,
                    toPubkey,
                    lamports: 0.1 * LAMPORTS_PER_SOL,
                })
            );
            console.log("Esta es la transaccion", transaction);

            //Traemos el ultimo blocke de hash
            const { blockhash } = await connection.getLatestBlockhash();
            transaction.recentBlockhash = blockhash;
            transaction.feePayer = fromPubkey;

            //Firmamos la transaccion
            const transactionsignature = await provider.signTransaction(
                transaction
            );
            //Enviamos la transaccion
            const txid = await connection.sendRawTransaction(
                transactionsignature.serialize()
            );
            console.info(`Transaccion con numero de id ${txid} enviada`);
            //Esperamos a que se confirme la transaccion
            const confirmation = await connection.confirmTransaction(txid, {
                commitment: "singleGossip",
            });

            const { slot } = confirmation.value;

            console.info(
                `Transaccion con numero de id ${txid} confirmado en el bloque ${slot}`
            );
            const solanaExplorerLink = `https://explorer.solana.com/tx/${txid}?cluster=${SOLANA_NETWORK}`;
            setExplorerLink(solanaExplorerLink);

            toast.success("Transaccion enviada con exito :D ");

            //Actualizamos el balance
            getBalances(publicKey);
            setAmount(null);
            setReceiver(null);

            return solanaExplorerLink;
        } catch (error) {
            console.error("ERROR SEND TRANSACTION", error);
            toast.error("Error al enviar la transaccion");
        }
    };

    const handleNo = async () => {
        if (currentIndex < 1) {
            setSelectedImage(imagenes[currentIndex + 1]);
            setCurrentIndex(currentIndex + 1); // Incrementa currentIndex
        } else {
            // Si la posición no es menor o igual a 1, regresamos al valor 0.
            setSelectedImage(imagenes[0]);
            setCurrentIndex(0); // Vuelve a 0
        }
    }

    const handleYes = async () => {
        // Realiza lo que necesites en la función handleYes.
        // No se proporciona código específico, ya que parece estar incompleto en tu ejemplo.
    }

    // Función para crear un NFT
    const generateNFT = async () => {
        try {
            setStatusText("Creando tu NFT...❤");

            // Reemplaza la URL con la que deseas crear el NFT
            //const imageUrl = "https://res.cloudinary.com/dwgeqqd7m/image/upload/v1697168407/tokentinder/OIP_ksloj5.jpg?fbclid=IwAR1D_265K2oAHqAMbbxH6nk3dx_dhIN7P1X1GwDdjmSbgWMld4bShpYLYOg&h=AT1kEqaclIOb-nMTLIgofeuOpv9H6-Mc8ggXeeh-d9-L-cGXjvGqs0lTXGfvRLKQRLy247qfBC5I_36o__1ZW-Om3BGLIaYmxKF9FNqMVFHL28ZPo8bQ_alocbSp0jEpsQr1Uxw";
            const imageUrl = setSelectedImage;
            const mintedData = {
                name: "Mi primer NFT con Superteam MX",
                imageUrl,
                publicKey,
            };

            console.log("Este es el objeto mintedData:", mintedData);
            setStatusText(
                "Minteando tu NFT en la blockchain Solana 🚀 Por favor espera..."
            );

            // Realiza la solicitud para crear el NFT
            const { data } = await axios.post("/api/mintnft", mintedData);
            const { signature: newSignature } = data;

            const solanaExplorerUrl = "https://solscan.io/tx/${newSignature}?cluster=${SOLANA_NETWORK}";
            console.log("solanaExplorerUrl", solanaExplorerUrl);

            setStatusText(
                "¡Listo! Tu NFT se ha creado, revisa tu Phantom Wallet 🖖"
            );
        } catch (error) {
            console.error("ERROR GENERATE NFT", error);
            toast.error("Ocurrió un error al generar el NFT");
        }
    };

    return (
        <div className="h-screen bg-black">
            <div className="flex flex-col  w-auto h-auto  bg-black">
                <div className="flex flex-col py-24 place-items-center justify-center">
                    <h1 className="text-5xl font-bold pb-10 text-emerald-300">
                        Superteach Starter
                    </h1>
                    {publicKey ? (
                        <div className="flex flex-col  place-items-center justify-center">
                            <button
                                type="submit"
                                className="inline-flex h-8 w-52 justify-center bg-purple-500 font-bold text-white"
                                onClick={() => {
                                    signOut();
                                }}
                            >
                                Desconecta tu wallet 👻
                            </button>
                            <a href={explorerLink}>
                                <h1 className="text-md font-bold text-sky-500">
                                    {explorerLink}
                                </h1>
                            </a>
                            <br />
                            <div className="appcontainer" >
                                <img src={selectedImage.url} alt="imagendescemtrañozada" />
                                <div className="buttons text-white my-8 flex justify-between font-2xl font-bold">
                                    <button className="border-2 border-white px-8 bg-red-500"
                                        onClick={() => handleNo()}
                                    >
                                        No
                                    </button>
                                    <button className="border-2 border-white px-8 bg-green-500"
                                        onClick={() => { sendTransaction() }}
                                    >
                                        Shi
                                    </button>
                                </div>
                            </div>
                            <br />
                        </div>
                    ) : (
                        <div className="flex flex-col place-items-center justify-center">
                            <button
                                type="submit"
                                className="inline-flex h-8 w-52 justify-center bg-purple-500 font-bold text-white"
                                onClick={() => {
                                    signIn();
                                }}
                            >
                                Conecta tu wallet 👻
                            </button>
                        </div>
                    )}
                </div>
                <Toaster position="bottom-center" />
            </div>
        </div>
    );
};

export default Home;
