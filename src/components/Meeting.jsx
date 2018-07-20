import React from 'react';
import { Modal, Toast, DatePicker, Checkbox, Radio, List, SearchBar } from 'antd-mobile';
import { hashHistory } from "react-router";
import { div2png, readyDo, TableHeads, init, GetLocationParam, NextStepAndAction } from './templates';
import { DrawBoard } from './drawBoard';

import BScroll from 'better-scroll';
import update from 'immutability-helper';

function parseDate(date) {
    if (typeof (date) == "string") {
        date = date.replace(/\-/g, "/")
    }
    return new Date(date)
}

function InterfaceCompanyStartTime(date) {
    const now = date ? parseDate(date) : new Date();
    let year = now.getFullYear();
    let month = now.getMonth() + 1;
    let day = now.getDate();
    let formatMonth = month < 10 ? "0" + month : month;
    let formatDay = day < 10 ? "0" + day : day;
    return `${year}-${formatMonth}-${formatDay}`;
}

function InterfaceCompanyStartTime2(date) {
    const now = date ? parseDate(date) : new Date();
    let year = now.getFullYear();
    let month = now.getMonth() + 1;
    let day = now.getDate();
    let hours = now.getHours();
    let minutes = now.getMinutes();
    let formatMonth = month < 10 ? "0" + month : month;
    let formatDay = day < 10 ? "0" + day : day;
    let formatHours = hours < 10 ? "0" + hours : hours;
    let formatMinutes = minutes < 10 ? "0" + minutes : minutes;

    return `${year}-${formatMonth}-${formatDay} ${formatHours}:${formatMinutes}:00`;
}

let canvas;
let drawBoard;
let numPlus = 0;
let interval=[];
let timeout=[];
const urls = {
    wordMsg: require('../images/wordMsg.png'),
}
export default class Meeting extends React.Component {
    constructor (props) {
        super(props);
        this.state = {
            meetingDate:"",
            meetingAddress:"",
            meetingAdmin:"",
            meetingWrite:"",
            meetingPersonal:"",
            meetingTitle:"",
            meetingResult:"",
            things:"",
            duty:"",
            finishTime:"",
            orderList:[],
            id:"",
            which:"-1",
            userList: [], //获取所有人员信息列表
            checkedUserList: [{id: 0}], //当前选择的人员信息列表
            modalUserList: false, //显示人员信息列表的弹窗，是否显示
            showModalUserList: "meetingAdmin", //选择的是哪项的人员列表，参加人员、记录人、主持人
            // meetingAdminUserId: '',
            // meetingWriteUserId: '',
            // meetingPersonalUserId: '',
            meetingAdminCheckedUserList: [],
            meetingWriteCheckedUserList: [],
            meetingPersonalCheckedUserList: [],
            scroll: null, //滚动插件实例化对象
			scroll_bottom_tips: "", //上拉加载的tips
            total_count: 0, //人员总数量
            searchText: '', //输入的搜索关键字
        },
        this.handleMeetingAdd=(res)=>{
            // console.log(res);
            if(res.success){
                Toast.info("成功", .8, null, false);
                this.setState({
                    id: res.message.id
                })
            }
        },
        this.saveProject = (res) => {
            console.log(res);
            if(res.success) {
                Toast.info("文件保存成功", 2, null, false);
                setTimeout(() => {
                    Toast.hide();
                }, 1000);
            }else{
                setTimeout(() => {
                    Toast.hide()
                }, 1000);
                Toast.info("文件保存失败", 2, null, false);
            }
        }
        this.handleGetMeetingInfo = (res) => {
            if (res.success) {
                console.log(res)
                let { id, start_time, address, user_list, title, content, plan_list, master_name, master_id, recorder_name, recorder_id } = res.data;

                let meetingPersonal = [];
                let meetingPersonalId = [];
                let meetingPersonalTxt = [];
                user_list.map((value, index, elem) => {
                    meetingPersonal.push(value.name);
                    meetingPersonalId.push(value.user_id);
                    meetingPersonalTxt.push(value.name);
                });

                plan_list.map((value, index, elem) => {
                    elem[index].exp_time = InterfaceCompanyStartTime(value.exp_time);
                });

                this.setState({
                    id, 
                    meetingDate: start_time,
                    meetingAddress: address,
                    meetingAdmin: master_name,
                    meetingWrite: recorder_name,
                    meetingPersonal: meetingPersonal.join(","),
                    meetingTitle: title,
                    meetingResult: content,
                    orderList: plan_list,
                    meetingAdminTxt: master_name,
                    meetingAdminId: master_id,
                    meetingWriteId: recorder_id,
                    meetingWriteTxt: recorder_name,
                    meetingPersonalId: meetingPersonalId.join("_"),
                    meetingPersonalTxt: meetingPersonalTxt.join("，"),
                })
            } else {
                Toast.info("获取会议详情失败", 1, null, false);
            }
        }
        this.handleGetUserList = (res, pullingUp) => {
            if (res.success) {
                // let userList = res.data.item_list;
                // userList.map((value, index, elem) => {
                //     elem[index].isChecked = false;
                // })
                let newItemList = this.state.userList;
                if (pullingUp) {
                    newItemList = [...newItemList, ...res.data.item_list];
                } else {
                    newItemList = res.data.item_list;
                }
                this.setState({
                    userList: newItemList,
                    total_count: res.data.total_count,
                    scroll_bottom_tips: res.data.item_list.length == 10 ? "上拉加载更多" : ""
                },() => {
                    if (this.state.scroll) {
                        this.state.scroll.finishPullUp()
                        this.state.scroll.refresh();
                    }
                })
            } else {
                Toast.info("获取人员列表失败", 1, null, false);
            }
        }
    }
    ajaxGetMeetingInfo() {
        if (!this.props.location.query || !this.props.location.query.id) {
            return;
        }
        //现场回访详细
        runPromise('get_meeting_info', {
            "meeting_id": this.props.location.query.id
        }, this.handleGetMeetingInfo, false, "post");
    }
    componentDidMount () {
        this.props.router.setRouteLeaveHook(
            this.props.route,
            this.routerWillLeave
        )
        readyDo(this.alerts);
        init("meetingResult");
        canvas = document.getElementById("canvas");
        drawBoard = new DrawBoard(canvas);  // 初始化
        let blurList = document.querySelectorAll("input");
        for (let s = 0; s < blurList.length; s++) {
            blurList[s].addEventListener('blur', () => {
                interval.push(setInterval(() => {
                    // this.addMeeting();
                }, 30000));
            })
        }
        let head = document.getElementsByClassName("tableHead")[0];
        let mainWrap = document.getElementById("mainWrap");
        head.style.position = "static";
        mainWrap.style.marginTop = '0';

        //判断URL有没有参数ID，需不需要获取会议详细信息
        this.ajaxGetMeetingInfo();

        //先获取10个人员信息列表
        this.ajaxGetUserList();
    }
    routerWillLeave(nextLocation) {
        let head = document.getElementsByClassName("tableHead")[0];
        head.style.position = "fixed";
        for(let i = 0;i < interval.length;i++){
            clearInterval(interval[i]);
        }
    }
    addMeeting = (flag = 2) => {
        runPromise('add_meeting', {
            "gd_project_id": validate.getCookie("project_id"),
            "title": this.state.meetingTitle,
            // "user_ids": this.state.meetingPersonal,
            "user_ids": this.state.meetingPersonalId,
            "copy_to_ids": "",
            "content": this.state.meetingResult,
            "suggest": "",
            "score": "",
            "plans": this.state.orderList,
            "address": this.state.meetingAddress,
            // "master_id": this.state.meetingAdmin,
            // "recorder_id": this.state.meetingWrite,
            "master_id": this.state.meetingAdminId,
            "recorder_id": this.state.meetingWriteId,
            "start_time": this.state.meetingDate,
            "end_time": "",
            "id":this.state.id,
            flag,
        }, this.handleMeetingAdd, false, "post");
    }
    clearAll = function () {
        drawBoard.clear();
    }
    cancelLast = function () {
        drawBoard.cancel();
    }
    showModal = key => (e, flg, index) => {
        e.preventDefault(); // 修复 Android 上点击穿透
        this.setState({
            [key]: true,
        }, () => {
            if (flg) {
                init("planThing");
            }
        });
        if (flg == 1) {
            this.setState({
                order: this.state.orderList[index].seq,
                things: this.state.orderList[index].content,
                duty: this.state.orderList[index].name,
                finishTime: this.state.orderList[index].exp_time
            })
        } else {

        }
        setTimeout(() => {
            let iptList = document.querySelectorAll(".am-modal-wrap input");
            for (var a = 0; a < iptList.length; a++) {
                iptList[a].addEventListener("focus", () => {
                    document.querySelector(".am-modal-wrap").style.marginTop = "-100px";
                }, false);
                iptList[a].addEventListener("blur", () => {
                    document.querySelector(".am-modal-wrap").style.marginTop = "0";
                }, false);
            }
        }, 500);
        // timeout.push(
        //     setTimeout(() => {
        //         let propmtTouchBox = document.querySelector(".am-modal-wrap");
        //         propmtTouchBox.addEventListener("touchmove", this.touchBlur, false);
        //     }, 500)
        // );
    }
    onClose = key => () => {
        this.setState({
            [key]: false,
        });
        // let propmtTouchBox = document.querySelector(".am-modal-wrap .am-modal");
        // propmtTouchBox.removeEventListener("touchmove", this.touchBlur, false);
        // for (let i = 0; i < timeout.length; i++) {
        //     clearTimeout(timeout[i]);
        // }
    }
    addOrderMsg() {       //下一任行动和计划
        ++numPlus;
        let lis = {
            seq: numPlus,
            content: this.state.things,
            name: this.state.duty,
            exp_time: this.state.finishTime
        }
        // if (this.state.things == ""){
        //     Toast.info('请填写事项！', .8);
        // }else if(this.state.duty == ""){
        //     Toast.info('请填写责任人！', .8);
        // }else if(this.state.finishTime == ""){
        //     Toast.info('请填写完成时间！', .8);
        // } else {
        this.onClose('modal2')();
        // }
        if (this.state.which != -1) {  //修改
            let aa = this.state.orderList;
            let bb = this.state.which;
            aa[bb].content = this.state.things;
            aa[bb].name = this.state.duty;
            aa[bb].exp_time = this.state.finishTime;
            this.setState({ orderList: aa });
        } else {     //新增
            this.state.orderList.push(lis);
            this.setState({
                order: "",
                things: "",
                duty: "",
                finishTime: ""
            })
        }
    }
    delPlanLis(idx) {
        console.log(idx);
        this.state.orderList.splice(idx, 1);
        this.setState({
            orderList: this.state.orderList
        })
    }
    alerts = (a) => {
        runPromise('sign_up_document', {
            action_type: "meeting",
            action_id: this.state.id,
            signed_file_path: a
        }, this.saveProject, true, "post");
    }
    onChangeThings(e) {
        this.setState({
            things: e.currentTarget.value
        });
    }
    onChangeDuty(e) {
        this.setState({
            duty: e.currentTarget.value
        });
    }
    onChangeFinish(e) {
        this.setState({
            finishTime: e.currentTarget.value
        });
    }
    save = function () {
        drawBoard.save('only-draw', function (url) {
            if (!url) {
                alert("请先签字后再保存");
                return;
            } else {
                console.log(url);
            }
        });
    }
    loadingToast() {
        Toast.loading('保存中...', 0, () => {
            // alert(4)
        },true);
    }
    touchBlur = () => {
        let iptList = document.getElementsByTagName("input");
        let txtList = document.getElementsByTagName("textarea");
        for (let a = 0; a < iptList.length; a++) {
            iptList[a].blur();
        }
        for (let b = 0; b < txtList.length; b++) {
            txtList[b].blur();
        }
    }

    //更新，下一步计划和行动，0719 start
    addResearch = (flag = 2) => {
        //判断下一步计划和行动的完成时间是否输入
        let { orderList } = this.state;
        orderList.map((value, index, elem) => {
            if (!value.exp_time) {
                elem[index].exp_time = InterfaceCompanyStartTime();
            }
        });
        this.addMeeting(flag); //发送数据
    }
    addOrderMsg2 = () => {
        // ++numPlus;
        let numPlus = this.state.orderList.length;
        let tmp = {
            seq: numPlus,
            content: '',
            name: '',
            exp_time: '',
            is_edit: true,
        }
        const orderList = update(this.state.orderList, { $push: [tmp] });
        this.setState({ orderList });
    }
    onChangeOrderList = (index, key, event) => {
        let value;
        if (key == "exp_time") {
            value = InterfaceCompanyStartTime(event);
        } else {
            value = event.target.value;
        }
        const orderList = update(this.state.orderList, { [index]: { [key]: { $set: value } } });
        this.setState({ orderList });
    }
    modifyPlan(index) {
        if (!this.state.orderList[index]) {
            return;
        }
        const orderList = update(this.state.orderList, { [index]: { is_edit: { $set: true } } });
        this.setState({
            orderList,
            which: index
        });
    }
    deletePlan(index) {
        if (!this.state.orderList[index]) {
            return;
        }
        const orderList = update(this.state.orderList, { $splice: [[[index], 1]] });
        this.setState({ orderList }, () => {
            //删除不能向后端去保存，因为不知道数组内其他数据是否是合法的。
            // this.addResearch();
        });
    }
    saveOrderOne(index) {
        if (!this.testStateOrderList(index)) {
            return;
        }
        const orderList = update(this.state.orderList, { [index]: { is_edit: { $set: false } } });
        this.setState({ orderList }, () => {
            this.addResearch();
        });
    }
    saveOrderList = () => {
        let { orderList: newOrderList } = this.state;
        let length = newOrderList.length;
        if (length < 1) {
            Toast.info('请先新增计划', .8);
            return;
        }
        let eq = 0;
        for (let i = 0; i < newOrderList.length; i++) {
            let testResult = this.testStateOrderList(i);
            if (!testResult)
                break;
            eq++;
        }
        if (eq < length) {
            return;
        }
        newOrderList.map((value, index, elem) => {
            elem[index].is_edit = false;
        })
        const orderList = update(this.state.orderList, { $set: newOrderList });
        this.setState({ orderList }, () => {
            this.addResearch();
        });
    }
    testStateOrderList(index) {
        let order = this.state.orderList[index];
        if (!order) {
            return false;
        }
        if (!order.content.trim()) {
            Toast.info('请填写事项', .8);
            return false;
        }
        if (!order.name.trim()) {
            Toast.info('请填写责任人', .8);
            return false;
        }
        if (!order.exp_time.trim()) {
            Toast.info('请选择完成时间', .8);
            return false;
        }
        return true;
    }
    ajaxGetUserList(offset = 0, limit = 10, pullingUp = false) {
        let { searchText: keycode } = this.state;
        //现场回访详细
        runPromise('get_user_list', {
            keycode,
            offset,
            limit,
        }, this.handleGetUserList, false, "post", pullingUp);
    }
    ajaxNextPage = () => {
        let hasNextPage = false;

        let offset = this.state.userList.length;
        if (offset < this.state.total_count) {
            hasNextPage = true;
        }
        this.setState({
            scroll_bottom_tips: hasNextPage ? "加载中..." : "加载完成"
        })

        if (hasNextPage) {
            setTimeout(() => {
                this.ajaxGetUserList(offset, 10, true)
            }, 100);
        }
    }
    /**
     *点击选择人员时，弹出所有人员信息列表的弹窗
     *
     * @memberof Meeting
     */
    onClickUserList(name) {
        this.setState({
            modalUserList: true,
            showModalUserList: name
        },()=>{
            // let searchBar = document.querySelector('.search-bar');
            // let modalFooter = document.querySelector('.modal-user-list .am-modal-footer');
            // const hei = document.documentElement.clientHeight - searchBar.offsetHeight - searchBar.offsetTop - modalFooter.offsetTop;
            const hei = document.querySelector('.user-list .am-list-item').clientHeight;
            const scroll = new BScroll(document.querySelector('.wrapper'), { click: true, pullUpLoad: { threshold: -40 }, bounceTime: 300, swipeBounceTime: 200 })
            this.setState({
                height: hei*10,
                scroll,
            })
            scroll.on('pullingUp', () => {
                this.ajaxNextPage();
            });
        })
    }
    //切换是否选择某个用户
    changeCheckboxUser(value) {
        // console.log(value);
        let { checkedUserList, showModalUserList } = this.state;
        // let { showModalUserList, userList } = this.state;

        // let checkedUserList = this.state[showModalUserList +"CheckedUserList"];

        // const newUserList = update(userList, { [index]: { isChecked: { $set: !userList[index].isChecked } } });
        
        if (showModalUserList == "meetingPersonal") {
            let isDelete = false; //判断数组里是否已经有值了，该次点击是删除还是添加
            checkedUserList.map((val, index, elem) => {
                if (val.user_id == value.user_id) {
                    elem.splice(index, 1);
                    isDelete = true;
                    return;
                }
                if (val.id == 0) {
                    elem.splice(index, 1); //删除无用项
                }
            });
            if (!isDelete) {
                checkedUserList.push(value)
            }
            this.setState({
                checkedUserList, 
                // userList: newUserList 
            });
        } else {
            let checkedUserList = [];
            checkedUserList.push(value);
            this.setState({
                checkedUserList,
            });
        }
    }
    closeUserList = () => {
        let { checkedUserList } = this.state;
        this.setState({
            checkedUserList: [{ id: 0 }]
        })
        this.onClose('modalUserList')(); //关闭弹窗
    }
    sureUserList = () => {
        let { showModalUserList, checkedUserList } = this.state;
        // let checkedUserId = [];
        // let checkedName = [];
        // checkedUserList.map((value, index, elem) => {
        //     checkedUserId.push(value.user_id)
        //     checkedName.push(value.name)
        // })
        // let key = `showModalUserList${UserId}`;

        let key = `${showModalUserList}CheckedUserList`;
        this.setState({
            [key]: checkedUserList,
            checkedUserList: [{ id: 0 }],
        })

        if (showModalUserList == "meetingPersonal") {
            let checkedUserId = [];
            let checkedName = [];
            checkedUserList.map((value, index, elem) => {
                checkedUserId.push(value.user_id)
                checkedName.push(value.name)
            })

            this.setState({
                [showModalUserList + "Txt"]: checkedName.join("，"),
                [showModalUserList + "Id"]: checkedUserId.join("_"),
            })
        } else {
            this.setState({
                [showModalUserList + "Txt"]: checkedUserList[0].name,
                [showModalUserList + "Id"]: checkedUserList[0].user_id,
            })
        }

        // this.setState({
        //     [showModalUserList]: checkedName,
        //     [key]: checkedUserId,
        //     checkedUserList: []
        // })
        this.onClose('modalUserList')(); //关闭弹窗
    } 
    onCancelSearch = () => {
        console.log("onCancel")
        this.setState({
            searchText: '',
        },()=>{
            this.onSearch();
        })
    }
    onClearSearch = () => {
        console.log("onClear")
        this.setState({
            searchText: '',
        }, () => {
            this.onSearch();
        })
    }
    onSearch = () => {
        console.log("onSearch")
        this.ajaxGetUserList();
    }
    onChangeSearch(val) {
        this.setState({ 
            searchText: val.trim(), 
        },()=>{
            val.trim().length == 0 ? this.onSearch() : null   
        })
    }
    render(){
        return (
            // <div className="visitRecordWrap" id="fromHTMLtestdiv" onTouchMove={() => { this.touchBlur(); }}>
            <div className="visitRecordWrap" id="fromHTMLtestdiv">
                <TableHeads url={urls.wordMsg} isHide={true}></TableHeads>
                <button id="downloadPng" onClick={() => {
                    // this.loadingToast();
                    this.addMeeting();
                    // for (let i = 0; i < interval.length; i++) {
                    //     clearInterval(interval[i]);
                    // }
                }}
                >下载图片</button>
                <div id="downloadPng3" onClick={() => {
                    this.addResearch(1);
                }}>保存并发送</div>
                <div id="downloadPng4" onClick={() => {
                    this.addResearch();
                }}>保存为草稿</div>
                <div className="recordMain">
                    <h2>会议纪要</h2>
                    <div className="tableDetails">
                        <table className="topTable">
                            <tr>
                                <th className="darkbg">会议日期</th>
                                <td>
                                    {/* <input type="text" 
                                        className="surveyIpt"
                                        placeholder="0000-00-00 00:00"
                                        value={this.state.meetingDate}
                                        onChange={(e)=>{this.setState({meetingDate:e.currentTarget.value})}}
                                    /> */}
                                    <DatePicker
                                        mode="datetime"
                                        title="会议日期"
                                        minDate={new Date()}
                                        extra={this.state.meetingDate}
                                        // value={this.state.meetingDate}
                                        onChange={date => this.setState({ meetingDate: InterfaceCompanyStartTime2(date)}) }
                                    >
                                        <span className="finish-time-span">{this.state.meetingDate ? this.state.meetingDate : "点击选择时间"}</span>
                                    </DatePicker>
                                </td>
                                <th className="darkbg">会议地址</th>
                                <td>
                                    <input type="text" 
                                        className="surveyIpt"
                                        value={this.state.meetingAddress}
                                        onChange={(e) => { this.setState({ meetingAddress: e.currentTarget.value }) }}
                                    />
                                </td>
                            </tr>
                            <tr>
                                <th className="darkbg">主持人</th>
                                <td style={{"padding":" 0.1rem"}}>
                                    {/* <input type="text" 
                                        className="surveyIpt"
                                        value={this.state.meetingAdmin}
                                        onChange={(e) => { this.setState({ meetingAdmin: e.currentTarget.value }) }}
                                    /> */}
                                    {this.state.meetingAdminTxt}
                                    <i 
                                        className="iconfont icon-jia add-more-btn-meet"
                                        // onClick={(e) => {
                                        //     this.state.toPersonalList.length > 0 ? this.showModal('modal4')(e) : Toast.info('暂无联系人', .8);
                                        // }}
                                        onClick={this.onClickUserList.bind(this, "meetingAdmin")}
                                    ></i>
                                </td>
                                <th className="darkbg">记录人</th>
                                <td style={{ "padding": " 0.1rem" }}>
                                    {/* <input type="text" className="surveyIpt"
                                        value={this.state.meetingWrite}
                                        onChange={(e) => { this.setState({ meetingWrite: e.currentTarget.value }) }}
                                    /> */}
                                    {this.state.meetingWriteTxt}
                                    <i
                                        className="iconfont icon-jia add-more-btn-meet"
                                        onClick={this.onClickUserList.bind(this, "meetingWrite")}
                                    ></i>
                                </td>
                            </tr>
                        </table>
                        <table className="sceneTable">
                            <tr>
                                <td className="darkbg">参加人员</td>
                                <td colSpan="3" style={{ "padding": " 0.1rem" }}>
                                    {/* <input type="text" className="surveyIpt" style={{padding:"0 5px"}}
                                        value={this.state.meetingPersonal}
                                        onChange={(e) => { this.setState({ meetingPersonal: e.currentTarget.value }) }}
                                    /> */}
                                    {this.state.meetingPersonalTxt}
                                    <i
                                        className="iconfont icon-jia add-more-btn-meet"
                                        onClick={this.onClickUserList.bind(this, "meetingPersonal")}
                                    ></i>
                                </td>
                            </tr>
                            <tr>
                                <td className="darkbg">会议主题</td>
                                <td colSpan="3">
                                    <input type="text" className="surveyIpt" style={{padding:"0 5px"}}
                                        value={this.state.meetingTitle}
                                        onChange={(e) => { this.setState({ meetingTitle: e.currentTarget.value }) }}                                        
                                    />
                                </td>
                            </tr>
                            <tr>
                                <td colSpan="4" className="darkbg">会议内容及成果</td>
                            </tr>
                            <tr >
                                <td colSpan="4">
                                    <textarea className="allBox" id="meetingResult" style={{minHeight:"4rem"}}
                                        value={this.state.meetingResult}
                                        onChange={(e) => { this.setState({ meetingResult: e.currentTarget.value }) }}                                            
                                    ></textarea>
                                </td>
                            </tr>
                            <tr>
                                {/* <td colSpan="4" className="darkbg newPersonalMsg">
                                    下一步计划和行动<span onClick={(e) => {
                                        this.showModal('modal2')(e);
                                        this.setState({
                                            which: "-1",
                                            things: "",
                                            duty: "",
                                            finishTime: ""
                                        })
                                    }}>新增 <i className="iconfont icon-jia"></i></span>
                                </td> */}
                                <td colSpan="4" className="darkbg newPersonalMsg">
                                    下一步计划和行动
                                        <span className="add-person-btn" onClick={this.saveOrderList}>保存</span>
                                    <span
                                        className="add-person-span"
                                        onClick={this.addOrderMsg2}
                                    >新增 <i className="iconfont icon-jia"></i></span>
                                </td>
                            </tr>
                            <NextStepAndAction
                                orderList={this.state.orderList}
                                modifyPlan={this.modifyPlan.bind(this)}
                                saveOrderOne={this.saveOrderOne.bind(this)}
                                deletePlan={this.deletePlan.bind(this)}
                                onChangeOrderList={this.onChangeOrderList}
                                state={this.state}
                                setState={this.setState.bind(this)}
                            />
                            <Modal
                                visible={this.state.modal2}
                                transparent
                                maskClosable={true}
                                onClose={this.onClose('modal2')}
                                className="personalLinkWrap planLis"
                                footer={[
                                    { text: '取消', onPress: () => { this.onClose('modal2')() } },
                                    { text: '确定', onPress: () => { this.addOrderMsg(); } }
                                ]}
                            >
                                <div className="personalLink addDutyList">
                                    <div className="personalLinkList">
                                        <ul>
                                            <li style={{ display: "none" }}>
                                                <span>序 号</span>
                                                <input
                                                    type="text"
                                                    value={this.state.order}
                                                />
                                            </li>
                                            <li style={{ height: "auto", lineHeight: "auto", overflow: "hidden" }}>
                                                <span style={{ float: "left", paddingTop: "10px", lineHeight: "25px" }}>事&nbsp;&nbsp;&nbsp;&nbsp;项</span>
                                                <textarea
                                                    id="planThing"
                                                    style={{
                                                        minHeight: "50px",
                                                        maxHeight: "200px",
                                                        paddingTop: "14px",
                                                        paddingBottom: "10px",
                                                        border: "0 none",
                                                        resize: "none",
                                                        backgroundColor: "#f5f5f5",
                                                        float: "left"
                                                    }}
                                                    onFocus={() => { document.querySelector(".am-modal-wrap").style.marginTop = "-150px"; }}
                                                    onBlur={() => { document.querySelector(".am-modal-wrap").style.marginTop = "0"; }}
                                                    onChange={(e) => {
                                                        this.setState({
                                                            things: e.currentTarget.value
                                                        })
                                                    }}
                                                    value={this.state.things}
                                                />
                                            </li>
                                            <li>
                                                <span>责 任 人</span>
                                                <input
                                                    type="text"
                                                    value={this.state.duty}
                                                    onChange={(e) => {
                                                        this.setState({
                                                            duty: e.currentTarget.value
                                                        });
                                                    }}
                                                />
                                            </li>
                                            <li>
                                                <span>完成时间</span>
                                                <input
                                                    type="text"
                                                    placeholder="0000-00-00"
                                                    value={this.state.finishTime}
                                                    onChange={(e) => {
                                                        this.setState({
                                                            finishTime: e.currentTarget.value
                                                        });
                                                    }}
                                                />
                                            </li>
                                        </ul>
                                    </div>
                                </div>
                            </Modal>
                            {/* <tr>
                                <td colSpan="4">
                                    <table className="plan">
                                        <tr>
                                            <td style={{ borderTop: "0 none", borderLeft: "0 none" }}>序号</td>
                                            <td style={{ borderTop: "0 none" }}>事项</td>
                                            <td style={{ borderTop: "0 none" }}>责任人</td>
                                            <td style={{ borderTop: "0 none" }}>完成时间</td>
                                            <td style={{ borderTop: "0 none", borderRight: "0 none" }}>操作</td>
                                        </tr>
                                        {
                                            this.state.orderList.map((value, idx) => {
                                                return <tr>
                                                    <td style={{ borderLeft: "0 none" }}>{idx + 1}</td>
                                                    <td style={{ paddingLeft: "5px", textAlign: "left" }}>
                                                        <pre dangerouslySetInnerHTML={{ __html: value.content }}></pre>
                                                    </td>
                                                    <td>{value.name}</td>
                                                    <td>{value.exp_time}</td>
                                                    <td>
                                                        <span onClick={(e) => { this.showModal('modal2')(e, 1, idx); this.setState({ which: idx, }) }}
                                                            style={{
                                                                color: "#fff",
                                                                padding: "2px 6px",
                                                                background: "#108ee9",
                                                                borderRadius: "3px",
                                                                fontSize: "14px"
                                                            }}
                                                        >修改</span>&nbsp;/&nbsp;
                                                            <span onClick={(e) => { this.delPlanLis(idx); }}
                                                            style={{
                                                                color: "#fff",
                                                                padding: "2px 6px",
                                                                background: "red",
                                                                borderRadius: "3px",
                                                                fontSize: "14px"
                                                            }}
                                                        >删除</span>
                                                    </td>
                                                </tr>
                                            })
                                        }
                                    </table>
                                </td>
                            </tr> */}
                            <tr>
                                <td colSpan="4" className="signatureTxt">
                                    <div className="suggess">
                                        <canvas id="canvas" width="1536" height="300"></canvas>
                                        <div className="signature sure" style={{ position: "relative", zIndex: "100" }}>
                                            <span style={{ backgroundColor: "#fff" }}>项目负责人(签字): </span>
                                        </div>
                                        <div className="dataType">
                                            <div className="bt-warn fn-right" style={{ position: "relative", zIndex: "1000" }}>
                                                <button type="button" onClick={this.clearAll}>重签</button>
                                                {/* <button type="button" onClick={this.save}>确认</button> */}
                                            </div>
                                            <div className="date" >
                                                <span>日期：</span>
                                                <input type="text" value={validate.getNowFormatDate()} />
                                            </div>
                                        </div>
                                    </div>
                                </td>
                            </tr>
                        </table>
                        <Modal
                            visible={this.state.modalUserList}
                            transparent
                            maskClosable={false}
                            onClose={this.onClose('modalUserList')}
                            className="modal-user-list"
                            style={{"width":"450px"}}
                            footer={[
                                { text: '取消', onPress: this.closeUserList },
                                { text: '确定', onPress: this.sureUserList }
                            ]}
                        >
                            <SearchBar
                                className="search-bar"
                                placeholder="请输入姓名或手机号查询"
                                maxLength={15}
                                value={this.state.searchText}
                                onChange={(val) => { this.onChangeSearch(val) }}
                                onCancel={this.onCancelSearch}
                                onClear={this.onClearSearch}
                                onSubmit={this.onSearch}
                            />
                            <div className="wrapper" style={{ overflow: "hidden", height: this.state.height }}>
                                <List className="user-list">
                                {
                                    this.state.userList.length > 0 &&
                                    this.state.userList.map((value, index) => {
                                        return this.state.showModalUserList == "meetingPersonal" ? 
                                        <Checkbox.CheckboxItem key={value.id} onChange={this.changeCheckboxUser.bind(this, value)}>
                                            { value.name }
                                            <span className="check-box-right-span">{ value.company_name }</span>
                                        </Checkbox.CheckboxItem> : 
                                            <Radio.RadioItem key={value.id} checked={value.id == this.state.checkedUserList[0].id} onChange={this.changeCheckboxUser.bind(this, value)}>
                                                { value.name }
                                                <span className="radio-right-span">{ value.company_name }</span>
                                            </Radio.RadioItem>
                                    })
                                }
                                <div className="scroll-bottom-tips">
                                    { this.state.scroll_bottom_tips }
                                </div>
                                </List>
                            </div>
                        </Modal>
                    </div>
                </div>
            </div>
        )
    }
}