import React, {Component} from 'react';
import SockJsClient from 'react-stomp';
import './App.css';
import Button from '@material-ui/core/Button';
import TextField from '@material-ui/core/TextField';
import './css/MessageStyle.css';
import NameComponent from "./components/NameComponent";
import CssBaseline from '@material-ui/core/CssBaseline';
import Icon from '@material-ui/core/Icon';
import Peer from "simple-peer";
import VideocamIcon from '@material-ui/icons/Videocam';
// const configuration = {
//     iceServers: [
//       {
//         urls: [
//           'stun:stun1.l.google.com:19302',
//           'stun:stun2.l.google.com:19302',
//         ],
//       },
//     ],
//     iceCandidatePoolSize: 10,
//   };

let callerPeer;

class App extends Component {

    constructor(props) {
        super(props);
        this.userVideoRef = React.createRef();
        this.remoteVideoRef = React.createRef();
        this.state = {
            messages: [],
            typedMessage: "",
            name: "",
            isVideoEnabled: false,
            isCaller: false,
            isCallReceived: false,
            receiverName: "",
            receivedSignal: "",
            isCallAnswered: false,
            joined: false
        }
    }

    setName = (name) => {
        console.log(name);
        this.setState({name: name});
    };

    onKeyDown = event => {
        if(event.keyCode === 13) {
            this.sendMessage()
        }
    }

    sendMessage = () => {
        this.clientRef.sendMessage('/app/user-all', JSON.stringify({
            name: this.state.name,
            message: this.state.typedMessage
        }));
        this.setState({typedMessage: ''})
    };


    displayMessages = () => {
        return (
            <div>
                {this.state.messages.map((msg, index) => {
                    return (
                        <div key={index}>
                            {this.state.name === msg.name ?
                                <div>
                                    <p className="title1">{msg.name} : </p><br/>
                                    <p>{msg.message}</p>
                                </div> :
                                <div>
                                    <p className="title2">{msg.name} : </p><br/>
                                    <p>{msg.message}</p>
                                </div>
                            }
                        </div>)
                })}
            </div>
        );
    };

    //Video call part
    getUserMedia = () => {
        navigator.mediaDevices.getUserMedia({ video: true, audio: true }).then( stream => {
            this.setState({ isVideoEnabled: true });
            this.setState({ stream })
            if(this.userVideoRef.current) {
                this.userVideoRef.current.srcObject = stream;
            }
        })
    }

    startCall = () => {
        const { stream, name } = this.state;
        if(!stream) {
            alert("Enable Video to start call");
            return;
        }
        this.setState({ isCaller: true })
        const peer = new Peer({
            initiator: true,
            trickle:  false,
            stream: stream
        })
        peer.on("signal", data => {
            this.clientRef.sendMessage('/app/callUser', JSON.stringify({
                name: name,
                signalData: data,
                type: "call"
            }));
        })
        peer.on("stream", stream => {
            if(this.remoteVideoRef.current) {
                this.remoteVideoRef.current.srcObject = stream
            }
        })
        callerPeer = peer;
    }

    //Answering the call
    answerCall = () => {
        const { stream, name, receivedSignal } = this.state;
        if(!stream) {
            alert("Enable Video to accept call");
            return;
        }
        this.setState({ isCallAnswered: true })
        const peer = new Peer({
            initiator: false,
            trickle: false,
            stream: stream
        })
        peer.on("signal", data => {
            this.clientRef.sendMessage('/app/callUser', JSON.stringify({
                name: name,
                signalData: data,
                type: "answer"
            }));
        })
        peer.on("stream", stream => {
            this.remoteVideoRef.current.srcObject = stream;
        })
        peer.signal(receivedSignal);
    }

    //EndCall
    // endCall = () => {
    //     const { joined, isCallAnswered } = this.state;
    //     this.setName({ joined: false, isCallAnswered: false });
    //     if(joined) {
    //         callerPeer.destroy();
    //     }
    //     if(isCallAnswered) {
    //         answeredPeer.destroy();
    //     }
    // }

    //Receiving msg from websocket
    onMessageReceive = msg => {
        console.log("message received",msg);
        const { messages, isCaller } = this.state;
        if(!msg.type) {
            var jobs = messages;
            jobs.push(msg);
            this.setState({messages: jobs});
        } else {
            if(msg.type === "call") {
                if(!isCaller) {
                    this.setState({ isCallReceived: true, receiverName: msg.name, receivedSignal: msg.signalData });
                }
            } else if(msg.type === "answer"){
                if(isCaller) {
                    this.setState({ joined: true })
                    callerPeer.signal(msg.signalData);
                }
            }
        }
    }

    render() {
        const { isCallReceived, receiverName, isCallAnswered } = this.state;

        return (
            <div>
                <CssBaseline />
                <NameComponent setName={this.setName}/>
                <div className="align-center">
                    <h1>Welcome to Crimson Chat</h1>
                    <br/><br/>
                </div>
                <div className="align-center">
                    User : <p className="title1"> {this.state.name}</p>
                </div>
                <div className="align-center">
                    <div style={{width: '400px'}}>
                        <TextField id="outlined-basic" label="Enter Message to Send" variant="outlined" 
                        onKeyDown={this.onKeyDown} value={this.state.typedMessage} autoFocus margin="normal" fullWidth
                                    onChange={(event) => {
                                        this.setState({typedMessage: event.target.value});
                                    }}/>
                    </div>
                </div>
                <div className="align-center">
                <Button variant="contained" color="primary" endIcon={<Icon>send</Icon>} size="large"
                                    onClick={this.sendMessage}>Send</Button>
                </div>
                <div className="align-center">
                    <video id="selfVideo" autoPlay playsInline ref={this.userVideoRef}/>
                    <video id="RemoteVideo" autoPlay playsInline ref={this.remoteVideoRef}/>
                </div>
                <div className="align-center">

                <Button variant="contained" color="primary" size="large"
                                    onClick={this.getUserMedia}>Enable Video</Button>

                <Button variant="contained" color="primary" endIcon={<Icon><VideocamIcon/></Icon>} size="large"
                                    onClick={this.startCall}>Start Call</Button>

                </div>
                <br/>
                {isCallReceived && !isCallAnswered && <div>
                    <div className="align-center">
                        {receiverName} is calling you
                    </div>
                    <div className="align-center">
                        <Button variant="contained" color="primary" endIcon={<Icon><VideocamIcon/></Icon>} size="large" onClick={this.answerCall}>Accept Call</Button> 
                    </div>   
                </div>}
                <br/>
                <div className="align-center">
                    {this.displayMessages()}
                </div>
                <SockJsClient url='https://crimsonchat.herokuapp.com/websocket-chat/'
                    topics={['/topic/user','/topic/receiveCall', '/topic/answeredCall']}
                    onMessage={(msg) => { this.onMessageReceive(msg) }}
                    ref={(client) => { this.clientRef = client }}/>
            </div>
        )
    }
}

export default App;