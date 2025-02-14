import React, { Component } from 'react';
import { Dialog, Input, Button, Icon } from '@alifd/next';
import { PluginProps } from '@alilc/lowcode-types';
import { event, project } from '@alilc/lowcode-engine';
import MonacoEditor from '@alilc/lowcode-plugin-base-monaco-editor';
import './index.less';

const HelpText = `你可以通过点击左侧区域绑定变量或处理函数，当然你也可以在上方输入复杂的表达式。
输入框内默认支持变量，写法和 JS 写法完全一致。<br>
this: '容器上下文对象'<br>
state: '容器的state'<br>
props: '容器的props'<br>
context: '容器的context'<br>
schema: '页面上下文对象'<br>
component: '组件上下文对象'<br>
constants: '应用常量对象'<br>
utils: '应用工具对象'<br>
dataSourceMap: '容器数据源Map'<br>
field: '表单Field对象'
`;

const defaultEditorProps = {
  style: { width: '100%', height: '200px' },
};

const defaultEditorOption = {
  readOnly: false,
  automaticLayout: true,
  folding: true, // 默认开启折叠代码功能
  lineNumbers: 'on',
  wordWrap: 'off',
  formatOnPaste: true,
  fontSize: 12,
  tabSize: 2,
  scrollBeyondLastLine: false,
  fixedOverflowWidgets: false,
  snippetSuggestions: 'top',
  minimap: {
    enabled: false,
  },
  scrollbar: {
    vertical: 'auto',
    horizontal: 'auto',
  },
};

export default class VariableBindDialog extends Component<PluginProps> {
  state = {
    visiable: false,
    // stateVaroableList: [],
    helpText: HelpText,
    // contextKeys: [],
    jsCode: '',
    searchValue: '',
    variableListMap: {}, // 变量列表
    selParentVariable: null, // 选中的父级变量
    childrenVariableList: [], // 子级变量列表
    field: {}, // 编辑器全局变量
    minimize: false, // 是否最小化
  };

  private editorJsRef = React.createRef();

  private monocoEditor: any;

  componentDidMount() {
    event.on('common:variableBindDialog.openDialog', ({ field }) => {
      this.setState({ field }, () => {
        this.initCode();
        this.openDialog();
      });
    });
  }

  initCode = () => {
    const { field } = this.state;
    const fieldValue = field.getValue();
    const jsCode = fieldValue?.value;

    this.setState({
      jsCode,
      // fullScreenStatus: false,
      // stateVaroableList: [],
      searchValue: '',
      variableListMap: {}, // 变量列表
      selParentVariable: null, // 选中的父级变量
      childrenVariableList: [], // 子级变量列表
      minimize: false, // 是否最小化
    });
  };

  /**
   * 获取methods数据源
   * @param  {String}
   * @return {Array}
   */
  getMethods(): any[] {
    const schema = project.exportSchema();

    const methodsMap = schema.componentsTree[0]?.methods;
    const methods = [];

    for (const key in methodsMap) {
      if (Object.prototype.hasOwnProperty.call(methodsMap, key) && key) {
        methods.push(`${key}()`);
      }
    }

    return methods;
  }

  /**
   * 获取AutoComplete数据源
   * @param  {String}
   * @return {Array}
   */
  getVarableList(): any[] {
    const schema = project.exportSchema();

    const stateMap = schema.componentsTree[0]?.state;
    const dataSource = [];

    for (const key in stateMap) {
      if (Object.prototype.hasOwnProperty.call(stateMap, key) && key) {
        dataSource.push(`this.state.${key}`);
      }
    }

    return dataSource;
  }

  /**
   * 获取数据源面板中的数据
   * @param  {String}
   * @return {Array}
   */
  getDataSource(): any[] {
    const schema = project.exportSchema();
    const stateMap = schema.componentsTree[0]?.dataSource;
    const list = stateMap?.list || [];
    const dataSource = [];

    for (const item of list) {
      if (item && item.id) {
        dataSource.push(`this.state.${item.id}`);
      }
    }

    return dataSource;
  }

  /**
   * 获取输入的上下文信息
   * @param  {Array}
   * @return {Array}
   */
  getContextKeys(keys?: []) {
    const { editor } = this.props;
    const limitKeys = ['schema', 'utils', 'constants'];
    if (!keys || keys.length === 0) return limitKeys;
    if (!limitKeys.includes(keys[0])) return [];
    let result = [];
    let keyValue = editor;
    let assert = false;
    keys.forEach((item) => {
      if (!keyValue[item] || typeof keyValue[item] !== 'object') {
        assert = true;
      }
      if (keyValue[item]) {
        keyValue = keyValue[item];
      }
    });
    if (assert) return [];
    result = Object.keys(keyValue);
    return result;
  }

  openDialog = () => {
    this.setState(
      {
        visiable: true,
      },
      () => {
        const methods = this.getMethods();
        const stateVaroableList = this.getVarableList();
        const dataSource = this.getDataSource();
        this.setState({
          variableListMap: {
            stateVaroableList: {
              name: 'State属性',
              childrens: stateVaroableList,
            },
            methods: {
              name: '自定义处理函数',
              childrens: methods,
            },
            dataSource: {
              name: '数据源',
              childrens: dataSource,
            },
          },
        });
      },
    );
  };

  closeDialog = () => {
    this.setState({
      visiable: false,
      minimize: false,
    });
  };

  onSelectItem = (value: string) => {
    const { lineNumber, column } = this.monocoEditor.getPosition();
    this.monocoEditor.executeEdits('insert-code', [
      {
        range: {
          startLineNumber: lineNumber,
          startColumn: column,
          endLineNumber: lineNumber,
          endColumn: column,
        },
        text: value,
      },
    ]);
  };

  updateCode = (newCode) => {
    this.setState(
      {
        jsCode: newCode,
      },
      this.autoSave,
    );
  };

  autoSave = () => {
    const { autoSave } = this.props;
    if (autoSave) {
      this.onOk(true);
    }
  };

  editorDidMount = (editor) => {
    this.monocoEditor = editor;

    setTimeout(() => {
      this.editorNode = this.editorJsRef.current; // 记录当前dom节点；
    }, 0);
  };

  onOk = (autoSave) => {
    const { field, jsCode } = this.state;
    const fieldValue = field.getValue();
    field.setValue({
      type: 'JSExpression',
      value: jsCode,
      mock:
        Object.prototype.toString.call(fieldValue) === '[object Object]'
          ? fieldValue.mock
          : fieldValue,
    });
    if (autoSave !== true) {
      this.closeDialog();
    }
  };

  removeTheBinding = () => {
    const { field } = this.state;
    const fieldValue = field.getValue();
    const value =
      Object.prototype.toString.call(fieldValue) === '[object Object]'
        ? fieldValue.mock
        : fieldValue;
    field.setValue(value);
    this.closeDialog();
  };

  renderBottom = () => {
    const { jsCode } = this.state;
    return (
      <div className="variable-bind-dialog-bottom">
        <div className="bottom-left-container">
          {jsCode && jsCode.length > 0 && (
            <Button type="normal" warning onClick={this.removeTheBinding}>
              移除绑定
            </Button>
          )}
        </div>

        <div className="bottom-right-container">
          <Button type="primary" onClick={this.onOk}>
            确定
          </Button>
          &nbsp;&nbsp;
          <Button type="normal" onClick={this.closeDialog}>
            取消
          </Button>
        </div>
      </div>
    );
  };

  onVariableSearchChange = (val) => {
    this.setState({
      searchValue: val,
    });

    const { variableListMap, selParentVariable } = this.state;
    const selectedVariable = variableListMap[selParentVariable];
    if (!selectedVariable) {
      return;
    }

    let newChildrenVariableList = [];
    newChildrenVariableList = selectedVariable.childrens.filter((item) => item.indexOf(val) > -1);
    this.setState({
      childrenVariableList: newChildrenVariableList,
    });
  };

  onVariableItemClick = (key: string) => {
    const { variableListMap } = this.state;
    this.setState({
      selParentVariable: key,
      childrenVariableList: variableListMap[key].childrens,
    });
  };

  minimizeClick = (state) => {
    this.setState({
      minimize: state,
      visiable: !state,
    });
  };

  renderTitle = () => {
    return (
      <div className="variable-dialog-title">
        <span>变量绑定</span>
        <img
          style={{ width: '12px' }}
          src="https://img.alicdn.com/imgextra/i1/O1CN01NlC5mY1bTvrlW3blw_!!6000000003467-55-tps-200-200.svg"
          onClick={() => this.minimizeClick(true)}
        />
      </div>
    );
  };

  render() {
    const {
      visiable,
      variableListMap,
      selParentVariable,
      childrenVariableList,
      helpText,
      jsCode,
      searchValue,
      minimize,
    } = this.state;
    return (
      <div>
        {minimize ? (
          <div className="vs-variable-minimize">
            <img
              onClick={() => this.minimizeClick(false)}
              src="https://img.alicdn.com/imgextra/i2/O1CN01HzeCND1vl948xPEWm_!!6000000006212-55-tps-200-200.svg"
            />
            <span onClick={() => this.minimizeClick(false)} className="vs-variable-minimize-title">
              变量绑定
            </span>
            <img
              onClick={this.closeDialog}
              src="https://img.alicdn.com/imgextra/i2/O1CN017cO64O1DzwlxwDSKW_!!6000000000288-55-tps-200-200.svg"
            />
          </div>
        ) : (
          ''
        )}

        <Dialog
          visible={!minimize && visiable}
          title={this.renderTitle()}
          onClose={this.closeDialog}
          footer={this.renderBottom()}
        >
          <div className="variable-dialog-body">
            <div className="dialog-left-container">
              <div className="dialog-small-title">变量列表</div>

              <div className="vs-variable-selector-inner">
                <ul className="vs-variable-selector-category vs-variable-selector-ul">
                  {Object.keys(variableListMap).map((key) => {
                    return (
                      <li
                        onClick={() => this.onVariableItemClick(key)}
                        className={selParentVariable === key && 'active'}
                        key={key}
                      >
                        {variableListMap[key].name}
                      </li>
                    );
                  })}
                </ul>
                <div className="vs-variable-selector-items-container">
                  <div className="ve-search-control">
                    <Input
                      innerAfter={<Icon type="search" size="xs" style={{ margin: 4 }} />}
                      placeholder="搜索"
                      value={searchValue}
                      aria-label="搜索"
                      style={{ width: '100%' }}
                      onChange={this.onVariableSearchChange}
                    />
                  </div>
                  <ul className="vs-variable-selector-items vs-variable-selector-ul">
                    {childrenVariableList &&
                      childrenVariableList.map((item) => (
                        <li onClick={() => this.onSelectItem(item)} key={item}>
                          {item}
                        </li>
                      ))}
                  </ul>
                </div>
              </div>
            </div>

            <div className="dialog-right-container">
              <div className="dialog-small-title">绑定</div>
              <div id="jsEditorDom" className="editor-context" ref={this.editorJsRef}>
                <MonacoEditor
                  value={jsCode}
                  {...defaultEditorProps}
                  {...defaultEditorOption}
                  {...{ language: 'javascript' }}
                  onChange={(newCode) => this.updateCode(newCode)}
                  editorDidMount={(useMonaco, editor) => {
                    this.editorDidMount.call(this, editor, useMonaco);
                  }}
                />
              </div>

              <div className="dialog-help-tip-input">
                <p className="vs-variable-content-desc-title">用法</p>
                <p dangerouslySetInnerHTML={{ __html: helpText }} />
              </div>
            </div>
          </div>
        </Dialog>
      </div>
    );
  }
}
