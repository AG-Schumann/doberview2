
function PopulateShiftsNavbar() {
  var content = '<li><div class="d-flex"> <button class="btn btn-primary" onclick="ShowDetail(null)">' +
      '<span>Add new &nbsp<i class="fas fa-solid fa-plus"></i><i class="fas fa-user"></i></span>' +
      '</button></div></li>';
  $('#navbar_content').prepend(content);
}

function PopulateOnShift() {
  $.getJSON('/shifts/on_shift', (data) => {
    $('#on_shift').empty();
    data.forEach(doc => $("#on_shift").append(`<li><div class="card"><div class="card-body">
        <h3 class="card-title" onclick=ShowDetail('${doc.name}')><i class=${doc.expert ? '"fas fa-user-graduate"':'"fas fa-user"'}></i>&nbsp; ${doc.first_name} ${doc.last_name}</h3>
        <ul>
            <li><span><i class="fa-solid fa-comment-sms"></i>&nbsp; ${doc.sms}</span></li>
            <li><span><i class="fa-solid fa-phone"></i>&nbsp; ${doc.phone}</span></li>
            <li><span><i class="fa-solid fa-envelope"></i>&nbsp; ${doc.email}</span></li>
        </ul>
    </div></div></li>`));
  });
}

function PopulateTable() {
  $.getJSON('/shifts/get_contacts', (data) => {
    $('#shift_table').empty();
    data.forEach(doc => {
      $("#shift_table").append(`
        <tr>
          <td onclick="ShowDetail('${doc.name}')">${doc.name}</td>
          <td><input type="checkbox" ${doc.on_shift ? 'checked' : ''}></td>
          <td>${doc.expert ? '<i class="fa-solid fa-square-check"></i></i>' : ''}</td>
          <td><i class="fas fa-solid fa-trash" onclick="DeleteShifter('${doc.name}')"></i></td>
        </tr>
      `);
    });
  });
}

function PopulateAlarmConfig() {
  $.getJSON('/shifts/alarm_config', doc => {
    let durations = $('#silence_durations');
    durations.html('<th>Silence duration / s</th>');
    let escalations = $('#escalation_settings');
    escalations.html('<th>Escalate after X messages</td>');
    let recipients = $('#recipients');
    recipients.html('<th>Recipients</th>');
    let protocols = $('#protocols');
    protocols.html('<th>Protocols</th>');

    for (var i in doc.silence_duration) {
      durations.append(`<td><input class="form-control-sm" type="number" value="${doc.silence_duration[i]}"></td>`);
      escalations.append(`<td><input class="form-control-sm" type="number" value="${doc.escalation_config[i]}"></td>`);
    }
    durations.append('<td></td>');
    escalations.append('<td></td>');
    for (var i in doc.recipients) {
      var check_shifters = (doc.recipients[i].includes('shifters') ? 'checked' : '');
      var check_experts = (doc.recipients[i].includes('experts') ? 'checked' : '');
      var check_everyone = (doc.recipients[i].includes('everyone') ? 'checked' : '');
      recipients.append(`<td><div><input class="form-check-input" type="checkbox" value="shifters" ${check_shifters}> Shifters</div>
                <div><input class="form-check-input" type="checkbox" value="experts" ${check_experts}> Experts</div>
                <div><input class="form-check-input" type="checkbox"  value="everyone" ${check_everyone}> Everyone</div></td>`);
    }
    for (var i in doc.protocols) {
      var check_mail = (doc.protocols[i].includes('email') ? 'checked' : '');
      var check_sms = (doc.protocols[i].includes('sms') ? 'checked' : '');
      var check_phone = (doc.protocols[i].includes('phone') ? 'checked' : '');
      protocols.append(`<td><div><input class="form-check-input" type="checkbox" value="email" ${check_mail}> Mail</div>
                <div><input class="form-check-input" type="checkbox" value="sms" ${check_sms}> SMS</div>
                <div><input class="form-check-input" type="checkbox" value="phone" ${check_phone}> Phone call</div></td>`);
    }
  });
}

function SubmitContact() {
  var shifter = {
    first_name: $("#first_name").val(),
    last_name: $("#last_name").val(),
    sms: $("#sms").val(),
    phone: $("#phone").val(),
    email: $("#email").val(),
    expert: $("#expert").is(":checked"),
    on_shift: false
  };
  $.post("/shifts/update_shifter", shifter, (data, status) => {
    if (typeof data.err != 'undefined')
      alert(data.err);
    else
      location.reload();
  });
}

function ShowDetail(name) {
  if (name == null) {
    ['first_name', 'last_name', 'sms', 'phone', 'email'].forEach(att => $(`#${att}`).val(""));
    $("#expert").attr('checked', false);
    $("#contact_detail").modal('show');
  } else {
    $.getJSON(`/shifts/contact_detail?name=${name}`, (doc) => {
      if (typeof doc.err != 'undefined') {
        alert(data.err);
        return;
      }
      ['first_name', 'last_name', 'sms', 'phone', 'email'].forEach(att => $(`#${att}`).val(doc[att]));
      $("#expert").attr('checked', doc.expert);
      $("#contact_detail").modal('show');
    });
  }
}

function SubmitShifts() {
  var shifters = $("#shift_table tr")
      .map((i,tr) =>
  ({
      name: tr.children[0].innerHTML,
      checked: tr.children[1].children[0].checked,
    }))
      .filter((i,row) => row.checked)
      .map((i,row) => row.name)
      .toArray(); // jquery is bullshit
  $.post('/shifts/set_shifters', {shifters: shifters}, (data, status) => {
  if (typeof data.err != 'undefined')
    alert(data.err);
  else
    location.reload();
  });
}

function DeleteShifter(name) {
  if (name === '')
    return;
  if (confirm(`Are you sure that you want to delete this contact?`)) {
    $.post('/shifts/delete_shifter', {name: name}, (data, status) => {
      if (typeof data.err != 'undefined')
        alert(data.err);
      else
        location.reload();
    });
  }
}


function SetAlarmConfig() {
  var newDoc = {
    silence_duration: [],
    escalation_config: [],
    recipients: [],
    protocols: []
  };

  // Extract silence duration and escalation settings
  $('#silence_durations input').each(function(index, element) {
    newDoc.silence_duration.push(parseInt($(element).val()));
  });

  $('#escalation_settings input').each(function(index, element) {
    newDoc.escalation_config.push(parseInt($(element).val()));
  });

  // Extract recipients
  $('#recipients td').each(function(index, element) {
    var recipientArray = [];
    $(element).find('input:checked').each(function() {
      recipientArray.push($(this).val());
    });
    newDoc.recipients.push(recipientArray);
  });

  // Extract protocols
  $('#protocols td').each(function(index, element) {
    var protocolArray = [];
    $(element).find('input:checked').each(function() {
      protocolArray.push($(this).val());
    });
    newDoc.protocols.push(protocolArray);
  });
  $.ajax({
    type: 'POST',
    url: '/shifts/set_alarm_config',
    data: newDoc,
    success: (data) => {
      if (typeof data != 'undefined' && typeof data.err != 'undefined')
        alert(data.err);
      else
        Notify(data.notify_msg, data.notify_status);
    },
    error: (jqXHR, textStatus, errorCode) => alert(`Error: ${textStatus}, ${errorCode}`),
  });
}