import React, {Component} from 'react';
import SockJsClient from 'react-stomp';
import './App.css';
import Button from '@material-ui/core/Button';
import TextField from '@material-ui/core/TextField';
import './css/MessageStyle.css';
import NameComponent from "./components/NameComponent";
import CssBaseline from '@material-ui/core/CssBaseline';
import Icon from '@material-ui/core/Icon';

class App extends Component {

    constructor(props) {
        super(props);
        this.state = {
            messages: [],
            typedMessage: "",
            name: ""
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
                <br/><br/>
                <div className="align-center">
                    {this.displayMessages()}
                </div>
                <SockJsClient url='http://localhost:8080/websocket-chat/'
                              topics={['/topic/user']}
                              onConnect={() => {
                              }}
                              onDisconnect={() => {
                              }}
                              onMessage={(msg) => {
                                  var jobs = this.state.messages;
                                  jobs.push(msg);
                                  this.setState({messages: jobs});
                              }}
                              ref={(client) => {
                                  this.clientRef = client
                              }}/>
            </div>
        )
    }
}

export default App;