import React, {Component} from 'react';
import SockJsClient from 'react-stomp';
import './App.css';
import Button from '@material-ui/core/Button';
import TextField from '@material-ui/core/TextField';
import './css/MessageStyle.css';
import NameComponent from "./components/NameComponent";
import CssBaseline from '@material-ui/core/CssBaseline';
import Icon from '@material-ui/core/Icon';

const configuration = {
    iceServers: [
      {
        urls: [
          'stun:stun1.l.google.com:19302',
          'stun:stun2.l.google.com:19302',
        ],
      },
    ],
    iceCandidatePoolSize: 10,
  };

let peerConnection = null;

let remoteStream = null;

class App extends Component {

    constructor(props) {
        super(props);
        this.videoRef = React.createRef();
        this.remoteVideoRef = React.createRef();
        this.state = {
            messages: [],
            typedMessage: "",
            name: "",
            stream: null,
            isCaller: null,
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

    componentDidUpdate() {
        if(remoteStream != null) {
            this.remoteVideoRef.current.srcObject = remoteStream
        }
    }

    sendMessage = () => {
        this.clientRef.sendMessage('/app/user-all', JSON.stringify({
            name: this.state.name,
            message: this.state.typedMessage
        }));
        this.setState({typedMessage: ''})
    };

    sendOffer = (offer) => {
        this.clientRef.sendMessage('/app/video-all', JSON.stringify({
            sdp: offer.sdp,
            type: offer.type
        }));
    }

    displayMessages = () => {
        return (
            <div>
                {this.state.messages.map(msg => {
                    return (
                        <div>
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

    handleOnClick = async event => {
        event.preventDefault();
        const stream = await navigator.mediaDevices.getUserMedia({video: true, audio: true});
        this.videoRef.current.srcObject = stream;
        this.setState({stream})
    }

    handleCall = async event => {
        event.preventDefault();
        const {stream} = this.state;
        this.setState({isCaller: true})
        
        peerConnection = new RTCPeerConnection(configuration);
        
        peerConnection.addStream(stream);

        this.registerPeerConnectionListeners();
        
        const offer = await peerConnection.createOffer();
        
        await peerConnection.setLocalDescription(offer);
        console.log("created offer", offer);
        this.sendOffer(offer);
    }

    processAnswer = async msg => {
        peerConnection.setRemoteDescription(new RTCSessionDescription(msg));
    }

    gotRemoteMediaStream(event) {
        remoteStream = event.stream;
    }

    registerPeerConnectionListeners() {
        peerConnection.addEventListener('icecandidate', this.handleConnection);
        peerConnection.addEventListener('addstream', this.gotRemoteMediaStream);
      }

    handleConnection = event => {
        const iceConnection = event.target;
        const iceCandidate = event.candidate;

        if(iceCandidate) {
            const newIceCandidate = new RTCIceCandidate(iceCandidate);
            if(iceConnection !== peerConnection) {
                console.log("coneection success");
                peerConnection.addIceCandidate(newIceCandidate);
            }
        }
    }

    process = async msg => {
        peerConnection.setRemoteDescription(new RTCSessionDescription(msg));
        const answer = await peerConnection.createAnswer();
        console.log('Created answer:', answer);
        await peerConnection.setLocalDescription(answer);
        this.sendAnswer(answer);
    }

    sendAnswer = answer => {
        this.clientRef.sendMessage('/app/answer-all', JSON.stringify({
            sdp: answer.sdp,
            type: answer.type
        }));
    }



    joinCall = event => {
        const { stream } = this.state;
        event.preventDefault();
        peerConnection =new RTCPeerConnection(configuration);
        this.registerPeerConnectionListeners();
        
        peerConnection.addStream(stream);

    }
    
    createdAnswer(description) {
      
        peerConnection.setLocalDescription(description)
          .then(() => {
              console.log("set local for remote")
          })
      }

    render() {
        return (
            <div>
                <CssBaseline />
                <NameComponent setName={this.setName}/>
                <div className="align-center">
                    <h1>Welcome to Global Chat</h1>
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
                    <video id="selfVideo" autoPlay playsInline ref={this.videoRef}/>
                    <video id="RemoteVideo" autoPlay playsInline ref={this.remoteVideoRef}/>
                </div>
                <div className="align-center">
                <Button variant="contained" color="primary" endIcon={<Icon>send</Icon>} size="large"
                                    onClick={this.handleOnClick}>Start Video</Button>
                <Button variant="contained" color="primary" endIcon={<Icon>send</Icon>} size="large"
                                    onClick={this.handleCall}>Start Call</Button>
                <Button variant="contained" color="primary" endIcon={<Icon>send</Icon>} size="large"
                                    onClick={this.joinCall}>Join Call</Button>
                </div>
                <br/><br/>
                <div className="align-center">
                    {this.displayMessages()}
                </div>
                <SockJsClient url='http://localhost:8080/websocket-chat/'
                              topics={['/topic/user','/topic/video', '/topic/answer']}
                              onConnect={() => {
                              }}
                              onDisconnect={() => {
                              }}
                              onMessage={(msg) => {
                                  console.log("message received",msg);
                                  if(msg.sdp == null) {
                                    var jobs = this.state.messages;
                                    jobs.push(msg);
                                    this.setState({messages: jobs});
                                  } else {
                                    if(msg.type === "offer") {
                                        console.log("offer coming", msg)
                                        this.process(msg);
                                    } else {
                                        console.log("answer coming", msg)
                                        this.processAnswer(msg);
                                    }
                                  }
                              }}
                              ref={(client) => {
                                  this.clientRef = client
                              }}/>
            </div>
        )
    }
}

export default App;