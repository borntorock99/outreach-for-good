import React, {PropTypes} from 'react';
import DataTable from '../common/data-table/DataTable';
import { List } from 'immutable';

import * as locAct from './localActions';
import * as locDef from './localDefinitions';
import RaisedButtonModel from '../../models/RaisedButtonModel';

const LetterTab = ({absenceRecords, ...props}) => {
/**
 * Handler Functions
 *   - Catch events from page elements and send to parent component
 */
  function buttonHandler(event) {
    event.preventDefault();
    props.clickHandler('dialogClick', this.value, event); // eslint-disable-line no-invalid-this
  }

  let buttons = [];

  /**
   * Material-UI <RaisedButton> and <Popover>
   *  - `menu:` become a <Popover> menu under button
   *  - `actionID:` is used by parent to launch dialogs
   *  - See RaisedButtonModel for default parameters
   */
  buttons.push(new RaisedButtonModel({
    label    : 'Filter',
    actionID : locAct.FILTER,
    menu     : {
      open : props.table.get('MuiPopovers').get(locAct.FILTER),
      item : locDef.filterButtonMenuItems
    }
  }));

  buttons.push(new RaisedButtonModel({
    label    : 'Edit',
    actionID : locAct.EDIT,
    menu     : {
      open : props.table.get('MuiPopovers').get(locAct.EDIT),
      item : locDef.editButtonMenuItems
    }
  }));


  const page = {
    title   : 'Letters Sent Dashboard',
    columns : locDef.absenceRecordTableColumns,
    buttons
  };

  return (
    <DataTable
      page={page}
      data={absenceRecords}
      {...props}
    />
  );
};

LetterTab.propTypes = {
  absenceRecords : PropTypes.instanceOf(List).isRequired,
  table          : PropTypes.object.isRequired,
  clickHandler   : PropTypes.func.isRequired,
};

export default LetterTab;
