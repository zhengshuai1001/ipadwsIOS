import React from 'react';
import { hashHistory, Link } from "react-router";
import { div2png, readyDo, TableHeads, GetLocationParam } from './templates';

import { Toast, Button, Modal } from 'antd-mobile';
import update from 'immutability-helper';

const urls = {
    wordMsg: require('../images/wordMsg.png'),
}

export default class MeetingList extends React.Component {
    constructor(props) {
        super(props);
        this.state = {
            meetingList:{
                item_list:[]
            },
            item_list: [],
        },
        this.handleMeetingListGet = (res) => {
            if(res.success){
                this.setState({
                    meetingList: res.data,
                    item_list: res.data.item_list,
                })
            }
        }
        this.handleDeleteDraft = (res, index) => {
            if (res.success) {
                Toast.success("删除成功", .8, () => {
                    let { item_list } = this.state;
                    if (!item_list[index]) {
                        return;
                    }
                    const newItem_list = update(item_list, { $splice: [[[index], 1]] });
                    this.setState({ item_list: newItem_list });
                })
            } else {
                Toast.info(res.message, 1.5, null, false);
            }
        }
    }
    componentDidMount() {
        runPromise('get_meeting_list', {
            "gd_project_id": validate.getCookie('project_id'),
            "offset": "0",
            "limit": "20"
        }, this.handleMeetingListGet, false, "post");
    }
    //删除草稿
    deleteDraft(index, id, name, e) {
        console.log(index, id, name, e)
        e.preventDefault(); //禁止默认事件，因为列表是通过a标签点击跳转的，可以通过禁止默认事件不让他跳转
        Modal.alert('删除', `确定删除${name}吗?`, [
            { text: '取消', onPress: () => { }, style: 'default' },
            { text: '确定', onPress: () => this.realDeleteDraft(index, id) },
        ]);
    }
    //真实的删除，发送ajax
    realDeleteDraft(index, id) {
        runPromise('delete_meeting', {
            meeting_id: id,
        }, this.handleDeleteDraft, true, "post", index);
    }
    render() {
        return (
            <div id="fromHTMLtestdiv">
                <form className="visitRecordWrap">
                    <TableHeads url={urls.wordMsg} isHide={false} tag={<h3>会议纪要</h3>}></TableHeads>
                    <div className="recordMain">
                        <h2 style={{ letterSpacing: "1px", marginTop: "0.8rem" }}>{validate.getCookie('company_name')}</h2>
                        <p style={{ textAlign: "center" }}>
                            {/* 责任设计师:  <span style={{ padding: "0 15px" }}></span>时间: <span style={{ padding: "0 15px" }}></span>回访: */}
                        </p>
                        <div className="visitLists">
                            <ul>
                                {
                                    // this.state.meetingList.item_list.map((value) => (
                                    this.state.item_list.map((value, index)=>(
                                        // <Link to={'/meetingStatic?id='+value.id}>
                                        <Link to={(value.flag != "1" ? '/meeting?id=' : '/meetingStatic?id=') + value.id}>
                                            <li style={{position:"relative"}}>
                                                {value.flag != "1" ? <span className="title-draft record">草稿</span> : null}
                                                {
                                                    value.signed_file_path ? <i className="iconfont icon-biaoji2"
                                                        style={{
                                                            display: "inline-block",
                                                            fontSize: "22px",
                                                            color: "#1ea1ef",
                                                            position: "absolute",
                                                            right: "0",
                                                            top: "0"
                                                        }}></i> : ""
                                                }
                                                <p>{value.title}</p>
                                                <p>{(value.start_time+'').split(" ")[0]}</p>
                                                {
                                                    value.flag != "1" ?
                                                        <Button
                                                            className="delete-draft-btn visit"
                                                            type="warning"
                                                            // inline
                                                            onClick={this.deleteDraft.bind(this, index, value.id, value.title)}
                                                        >删除</Button> : null
                                                }
                                            </li>
                                        </Link>
                                    ))
                                }
                            </ul>
                        </div>
                    </div>
                </form>
            </div>

        )
    }
}