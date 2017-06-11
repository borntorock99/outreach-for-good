import React from 'react';
import PropTypes from 'prop-types';
import { connect } from 'react-redux';
import { bindActionCreators } from 'redux';

import * as localAction from './admin.actions';
import * as schoolAction from '../../modules/school';
import * as userAction from '../../modules/user';

import Dimensions from 'react-dimensions-cjs';
import { List } from 'immutable';
import { Tab, Tabs } from 'material-ui/Tabs';

import FormModel from '../../models/form';
import SchoolsTab from './tabs/schools';
import SettingsTab from './tabs/settings';
import TableModel from '../../models/table';
import UsersTab from './tabs/users';

const table = new TableModel();
const form = new FormModel();

class AdminPage extends React.Component {
  constructor(props, context) {
    super(props, context);

    // Register Initial Component State
    let nextTable = table.setSelectedTab(table, 'users');
    nextTable = this.initClickActions(nextTable);
    this.state = {
      table  : nextTable,
      loaded : false,
      form
    };
  }

  componentDidMount() {
    this.retrieveData('users');
  }

  componentWillReceiveProps(nextProps) {
    let nextTable = this.state.table;
    let dataLoaded = false;
    switch (nextTable.get('selectedTab')) {
    case 'users':
      if(nextProps.users.size) {
        //console.log('Got It!!! ', nextProps.users.size);
        dataLoaded = true;
        nextTable = table.updateSortCol(nextTable, '');
        nextTable = table.buildIndexMap(nextTable, nextProps.users);
      }
      break;
    case 'schools':
      if(nextProps.schools.size) {
        //console.log('Got It!!! ', nextProps.schools.size);
        dataLoaded = true;
        nextTable = table.updateSortCol(nextTable, '');
        nextTable = table.buildIndexMap(nextTable, nextProps.schools);
      }
      break;
    }
    if(!this.state.loaded && dataLoaded) {
      //console.log('setstate');
      this.setState({
        table  : nextTable,
        loaded : true,
        form   : this.state.form
      });
    }
  }

  componentDidUpdate(prevProps, prevState) {
    let selectedTab = this.state.table.get('selectedTab');
    if(prevState.table.get('selectedTab') != selectedTab) {
      this.retrieveData(selectedTab);
    }
  }

  /**
   * Perform API call to Retrieve Data
   *   - Retrieve and configure data for table
   *   - Set default state for 'action' variables
   */
  retrieveData = currentTab => {
    switch (currentTab) {
    case 'users':
      this.props.userAction.getAllUsers();
      this.props.schoolAction.getAllSchools();
      break;
    case 'schools':
      this.props.schoolAction.getAllSchools();
      break;
    }
  }

  /**
   * Initialize Click Actions (on tab change)
   */
  initClickActions = nextTable => {
    nextTable = table.addPopovers(nextTable, {
      [localAction.EDIT] : false
    });
    nextTable = table.addDialogs(nextTable, {
      [localAction.EDIT_SCHOOL]   : false,
      [localAction.EDIT_ROLE]     : false,
      [localAction.REMOVE_USER]   : false,
      [localAction.NEW_SCHOOL]    : false,
      [localAction.REMOVE_SCHOOL] : false
    });
    return nextTable;
  }

  /**
   * Click Handler
   *   - Child component actions that affect local state
   *   - Any actions that affect redux state
   *   - Actions resulting in API calls
   */
  clickHandler = (action, data, event) => {
    let nextTable;
    let nextForm;
    switch (action) {

    // Clicked a main tab
    case 'changeTabs':
      nextTable = table.setSelectedTab(this.state.table, data.props.value);
      nextTable = this.initClickActions(nextTable);
      this.setState({table: nextTable, loaded: false});
      break;

    /**
     * DataTable Click / Filter Handler
     *   - Select / de-select a table row
     *   - Sort by a column
     *   - Apply a filter
     */
    case 'toggleSelected':
      nextTable = table.toggleSelectedRowIndex(this.state.table, data);
      this.setState({table: nextTable});
      break;
    case 'toggleSortCol':
      nextTable = table.updateSortCol(this.state.table, data);
      nextTable = table.sortIndexMap(nextTable,
        nextTable.get('selectedTab') == 'users'
          ? this.props.users : this.props.schools);
      this.setState({table: nextTable});
      break;
    case 'changeFilterCol':
      //console.log(data.substr(7), event);
      let tabData = this.state.table.get('selectedTab') == 'users'
          ? this.props.users : this.props.schools;
      nextTable = table.updateFilterBy(this.state.table, tabData, data.substr(7), event);
      nextTable = table.sortIndexMap(nextTable, tabData);
      this.setState({table: nextTable});
      break;

    /**
     * Dialog / Modal Click Handler
     *   - Typically results in `Cancel` or `Submit` (API Call)
     */
    case 'dialogClick':
      if(localAction.DIALOG_LIST.indexOf(data) != -1) {
        // Click inside dialog with associated API action
        let users, schools; // eslint-disable-line one-var
        switch (data) {
        case localAction.EDIT_SCHOOL:
          users = this.state.table.get('selectedData')
            .map(row => row._id);
          this.props.userAction.updateUserSchool(users.toArray(),
            this.getSchoolId(this.state.form.get('field').get('editSchool')));
          break;
        case localAction.EDIT_ROLE:
          users = this.state.table.get('selectedData').map(row => row._id);
          this.props.userAction.updateUserRole(users.toArray(),
            this.state.form.get('field').get('editRole'));
          break;
        case localAction.REMOVE_USER:
          users = this.state.table.get('selectedData')
            .map(row => row._id);
          this.props.userAction.removeUser(users.toArray());
          break;
        case localAction.NEW_SCHOOL:
          this.props.schoolAction.addSchool(this.state.form.get('field').get('newSchool'));
          break;
        case localAction.REMOVE_SCHOOL:
          schools = this.state.table.get('selectedData')
            .map(row => row._id);
          this.props.schoolAction.removeSchool(schools.toArray());
          break;
        }
        nextTable = this.initializeTable(this.state.table.selectedTab);
        this.setState({table: nextTable});
      } else {
        // Click inside dialog with no API action (close dialog)
        nextTable = table.resetDialogs(this.state.table);
        this.setState({table: nextTable});
      }
      break; // End of: case 'dialogClick'

    /**
     * Button / Popover Menu Click Handler
     *   - Typically opens a <Dialog> modal or popover menu
     *   - Initialize dialog and form field parameters
     */
    case 'menuClick':
    case 'buttonClick':
      nextTable = table.setSelectedRowData(this.state.table,
        this.getSelectedRowData());
      nextForm = this.state.form;
      // Does this action open a dialog?
      if(localAction.DIALOG_LIST.indexOf(data) != -1) {
        // Initialize form state
        nextTable = table.toggleDialogs(nextTable, data);
        nextTable = table.resetPopovers(nextTable);
        switch (data) {
        case localAction.EDIT_SCHOOL:
          nextForm = form.setFieldValue(nextForm, 'editSchool',
            this.props.schools.first().name);
          break;
        case localAction.EDIT_ROLE:
          nextForm = form.setFieldValue(nextForm, 'editRole', 'teacher');
          break;
        case localAction.REMOVE_USER:
          break;
        case localAction.NEW_SCHOOL:
          nextTable = table.clearSelectedRows(nextTable);
          nextForm = form.disableSubmitButton(nextForm);
          break;
        case localAction.REMOVE_SCHOOL:
          break;
        }
      } else if(data == localAction.EDIT) {
        nextTable = table.togglePopovers(nextTable, data);
        nextTable = table.setAnchor(nextTable, event.currentTarget);
        nextTable = table.resetDialogs(nextTable);
      }
      this.setState({table: nextTable, form: nextForm});
      break; // End of: case 'menuClick' or 'buttonClick'

    // Clicked away from popover menu
    case 'popoverClose':
      nextTable = table.resetPopovers(this.state.table);
      this.setState({table: nextTable});
      break;

    /**
     * Form Field Click Handler(s)
     *   - Form state is tracked in this.state.form
     */

    // User made new dropdown menu selection
    case 'dropdownChange':
      switch (event) {
      case localAction.EDIT_SCHOOL:
        nextForm = form.setFieldValue(this.state.form, 'editSchool', data);
        break;
      case localAction.EDIT_ROLE:
        nextForm = form.setFieldValue(this.state.form, 'editRole', data);
        break;
      }
      this.setState({form: nextForm});
      break; // End of: case 'dropdownChange'

    // Real-time text field validation
    case 'textFieldChange':
      nextForm = this.state.form;
      switch (event.target.id) {
      case localAction.NEW_SCHOOL:
        if(!this.props.schools.filter(i => i.includes(data)).isEmpty()) {
          nextForm = form.disableSubmitButton(nextForm);
          nextForm = form.setErrorMessage(nextForm, 'newSchool', 'School name already exists');
        } else if(data.length == 0) {
          nextForm = form.disableSubmitButton(nextForm);
        } else {
          nextForm = form.setFieldValue(nextForm, 'newSchool', data);
          nextForm = form.setErrorMessage(nextForm, 'newSchool', '');
          nextForm = form.enableSubmitButton(nextForm);
        }
        this.setState({form: nextForm});
        break;
      }
      break; // End of: case 'textFieldChange'

    // Catch [ENTER] keystrokes and submit form
    case 'textFieldEnter':
      // Catching enter requires workaround (submitting a form-wrapper)
      switch (event.target.id) {
      case 'NEW_SCHOOL_FORM':
        if(this.props.schools.filter(i => i.includes(this.state.form.get('field').get('newSchool'))).isEmpty()
          && document.getElementById(localAction.NEW_SCHOOL).value.length != 0) {
          this.clickHandler('dialogClick', localAction.NEW_SCHOOL, event);
        }
        break;
      }
      break; // End of: case 'textFieldChange'
    }
  } // End of: clickHandler()

  // Given a table-row index number, return object containing all row data
  getSelectedRowData = () =>
    this.props[this.state.table.get('selectedTab')]
      .filter((v, i) => this.state.table.get('selectedIndex')
      .indexOf(i) != -1);

  // Given a school name, return school _id
  getSchoolId = schoolName =>
    this.props.schools.find(v => v.name == schoolName)._id;

  // Handle user changing main tabs
  tabHandler = data => {
    this.clickHandler('changeTabs', data);
  }

  render() {
    let viewport = {
      width  : this.props.containerWidth - 20,
      height : this.props.containerHeight - 48 - 80
    }; // Facillitates table realtime resizing
    return (
      <Tabs
        style={{width: this.props.containerWidth}}
        value={this.state.table.get('selectedTab')}
      >
        <Tab
          label='Users'
          onActive={this.tabHandler}
          value='users'
        >
          <UsersTab
            view = {viewport}
            users = {this.props.users}
            schools = {this.props.schools}
            table = {this.state.table}
            form = {this.state.form}
            loaded = {this.state.loaded}
            clickHandler = {this.clickHandler}
          />
        </Tab>
        <Tab
          label='Schools'
          onActive={this.tabHandler}
          value='schools'
        >
          <SchoolsTab
            view = {viewport}
            schools = {this.props.schools}
            table = {this.state.table}
            form = {this.state.form}
            loaded = {this.state.loaded}
            clickHandler = {this.clickHandler}
          />
        </Tab>
        <Tab
          label="Settings"
          onActive={this.tabHandler}
          value="settings">
            <SettingsTab />
        </Tab>
      </Tabs>
    );
  }
}

AdminPage.propTypes = {
  userAction      : PropTypes.object.isRequired,
  schoolAction    : PropTypes.object.isRequired,
  users           : PropTypes.instanceOf(List),
  schools         : PropTypes.instanceOf(List),
  containerWidth  : PropTypes.number.isRequired,
  containerHeight : PropTypes.number.isRequired
};

function mapStateToProps(state) {
  return {
    schools : state.schools,
    users   : state.users
  };
}

function mapDispatchToProps(dispatch) {
  return {
    userAction   : bindActionCreators(userAction, dispatch),
    schoolAction : bindActionCreators(schoolAction, dispatch)
  };
}

//https://github.com/digidem/react-dimensions-cjs/issues/44
export default connect(mapStateToProps, mapDispatchToProps)(
  Dimensions({elementResize: true})(AdminPage));