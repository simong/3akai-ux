$(".calendar_date_small").corners("5px");
$(".site_task_extra_reading_material").corners("8px");
$(".site_tasks_assignment_notes").corners();
$(".site_tasks_assignment_attachments").corners();
$(".site_tasks_assignment_notes h4 img").live("click", function(){
    var img = ($(this).attr('src') === '/dev/_images/arrow-right.png') ? '/dev/_images/arrow-down.png' : '/dev/_images/arrow-right.png';
    $(this).attr('src', img);
    $(".site_tasks_assignment_notes_inner").toggle();
});

$(".site_tasks_assignment_notes a").live("click", function(){
    var img = ($(this).attr('src') === '/dev/_images/arrow-right.png') ? '/dev/_images/arrow-down.png' : '/dev/_images/arrow-right.png';
    $(this).attr('src', img);
    $(".site_tasks_assignment_notes_inner").toggle();
});

$("#site_tasks_assignment_submit").live("click", function(){
    window.location = '/dev/tasks_info.html?submitted=true';
});


// Extremele dirty hack
if (window.location.search === "?submitted=true") {
    $(".site_tasks_header .button-grey input").val("+ Re-submit work");
}

