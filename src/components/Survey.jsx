import React from 'react';
import { hashHistory, Link } from "react-router";
import { Toast, Button, Modal } from 'antd-mobile';
import { TableHeadServey, Customs } from './templates';

import update from 'immutability-helper';

const urls = {
    wordMsg: require('../images/wordMsg.png'),
    custom: require('../images/custom.png')
}
export default class survey extends React.Component{
    constructor(props) {
        super(props);
        this.state={
            researchHistoryList:{
                item_list:[]
            },
            item_list: [],
        },
        this.handleProjectGet=(res)=>{
            if(res.success){
                this.setState({
                    researchHistoryList: res.data,
                    item_list: res.data.item_list,
                })
            }else{
                Toast.info(res.message, 2, null, false);
            }
        }
        this.handleDeleteDraft = (res, index) => {
            if (res.success) {
                Toast.success("删除成功", .8, ()=>{
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
    componentDidMount(){
        runPromise('get_project_list', {
            "type": "3",
            "offset": 0,
            "limit": 20,
            "sort": "add_time",
            "choose": 0
        }, this.handleProjectGet, false, "post");
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
        runPromise('delete_project', {
            gd_project_id: id,
        }, this.handleDeleteDraft, true, "post", index);
    }
    render(){
        return (
            <div className="surveyWrap visitRecordWrap">
                <TableHeadServey 
                    url={urls.wordMsg} 
                    isHide={false}
                    tag={<h3 className="fn-left">
                        <Link to='/newSurveyHistory'><span style={{color:"#fff"}}>新建调研</span></Link>
                        <span style={{ borderBottom: "3px solid red" }}>历史调研</span>
                    </h3>}
                ></TableHeadServey>
                {/* <div style={{ height: "1.3rem", position: "relative", width: "100%" }}></div>                 */}
                <div className="surveyList animatePageY">
                    <ul>
                        {
                            // this.state.researchHistoryList.item_list.map((value, index) => (
                            this.state.item_list.map((value, index)=>(
                                <Link 
                                    to={(value.flag != "1" ? '/newSurveyHistory?id=' : '/surveyHistory?id=') + value.gd_company_id}>
                                    <li style={{position:"relative"}}>
                                        {
                                            value.signed_file_path ? <i className="iconfont icon-biaoji2"
                                                style={{
                                                    display: "inline-block",
                                                    fontSize: "22px",
                                                    color: "#1ea1ef",
                                                    position: "absolute",
                                                    right: "0",
                                                    top: "0"
                                                }}></i>:""
                                        }
                                        <h3>{value.company_name}{value.flag != "1" ? <span className="title-draft">草稿</span> : null }</h3>
                                        <p>文件编号：{value.document_id} <span></span>调研日期：{(value.add_time + '').split(" ")[0]} <span></span>调研人：{value.master_designer_name}</p>
                                        <p className="redText">
                                            <i>综合意见：</i>
                                            {value.suggestion}
                                            {
                                                value.flag != "1" ? 
                                                    <Button
                                                        className="delete-draft-btn survey"
                                                        type="warning"
                                                        inline
                                                        onClick={this.deleteDraft.bind(this, index, value.id, value.company_name)}
                                                    >删除</Button> : null
                                            }
                                            
                                        </p>
                                    </li>
                                </Link>
                            ))
                        }
                    </ul>
                </div>
            </div>
        )
    }
}