from invoices.models import Invoice, ApprovalRoute, User

try:
    # 1. Check Invoice 34
    invoice = Invoice.objects.get(id=34)
    print(f"Invoice ID: {invoice.id}, Status: {invoice.status}")
    print(f"Current Approver: {invoice.current_approver} (ID: {invoice.current_approver_id})")
    
    # 2. Check Route
    route = invoice.approval_route
    print(f"\nRoute: {route.name} (ID: {route.id})")
    steps = route.steps.all().order_by('step_order')
    for step in steps:
        user_name = step.approver_user.get_full_name() if step.approver_user else "None"
        print(f"  Step {step.step_order}: {step.step_name} (Position: {step.approver_position}, User: {user_name})")

    # 3. Check User ID 4
    try:
        user4 = User.objects.get(id=4)
        print(f"\nUser ID 4: {user4.username}, Name: {user4.get_full_name()}, Email: {user4.email}, Position: {user4.position}")
    except User.DoesNotExist:
        print("\nUser ID 4 not found")

    # 4. Check who approved so far (History)
    print("\nApproval History:")
    for history in invoice.approval_histories.all().order_by('timestamp'):
        print(f"  - {history.action} by {history.user.get_full_name()} at {history.timestamp}")

except Exception as e:
    print(f"Error: {e}")
