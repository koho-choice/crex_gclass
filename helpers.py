def get_user_name_and_email(service, user_id):
    """
    Retrieves the full name and email of a user given their user ID.

    Args:
        service: The Google Classroom API service instance.
        user_id: The ID of the user whose name and email are to be retrieved.

    Returns:
        A tuple containing the full name and email of the user, or ('Unknown Name', 'Unknown Email') if an error occurs.
    """
    try:
        user_info = service.userProfiles().get(userId=user_id).execute()
        full_name = user_info.get('name', {}).get('fullName', 'Unknown Name')
        email = user_info.get('emailAddress', 'Unknown Email')
        return full_name, email
    except HttpError as error:
        print(f"An error occurred while retrieving user info: {error}")
        return 'Unknown Name', 'Unknown Email'