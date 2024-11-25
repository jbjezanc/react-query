import {
  Link,
  redirect,
  useNavigate,
  useSubmit,
  useNavigation,
} from 'react-router-dom';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useParams } from 'react-router-dom';

import Modal from '../UI/Modal.jsx';
import EventForm from './EventForm.jsx';
import { fetchEvent, updateEvent, queryClient } from '../../util/http.js';
import ErrorBlock from '../UI/ErrorBlock.jsx';
// we don't use loading indicator any more
// import LoadingIndicator from '../UI/LoadingIndicator.jsx';

export default function EditEvent() {
  const navigate = useNavigate();
  // get hold of navigation state of this router action
  const { state } = useNavigation();
  // we use programatic react router useSubmit() hook which gives us back
  // the function to programatically send data to the action function
  const submit = useSubmit();
  const params = useParams();

  // we have removed isPending state boolean, btw we didn't remove useQuery as to
  // favor loader() function, instead this query uses cached data and we still
  // have access to many benefits from react query, loader and query don't clash;
  // mutation and action clash, so we removed the mutation in favor of action
  const { data, isError, error } = useQuery({
    queryKey: ['events', params.id],
    queryFn: ({ signal }) => fetchEvent({ signal, id: params.id }),
    // avoid second request by react query which already happened with loader
    staleTime: 10000, // cached data is re-used without new fetch request
  });

  // REPLACED BY THE action function at the bottom as an alternative
  // const { mutate } = useMutation({
  //   mutationFn: updateEvent,
  //   onMutate: async (data) => {
  //     const newEvent = data.event;
  //     await queryClient.cancelQueries({ queryKey: ['events', params.id] });
  //     const previousEvent = queryClient.getQueryData(['events', params.id]);
  //     queryClient.setQueryData(['events', params.id], newEvent);

  //     return { previousEvent };
  //   },
  //   onError: (error, data, context) => {
  //     queryClient.setQueryData(['events', params.id], context.previousEvent);
  //   },
  //   onSettled: () => {
  //     queryClient.invalidateQueries(['events', params.id]);
  //   },
  // });

  function handleSubmit(formData) {
    // we dont use mutation from react query, as an alternative we use action function
    //  mutate({ id: params.id, event: formData });
    //  navigate('../');

    // programatically submit the data - i.e. send it to the action function down below
    submit(formData, { method: 'put' });
  }

  function handleClose() {
    navigate('../');
  }

  let content;

  // we don't use isPending boolean any more
  // if (isPending) {
  //   content = (
  //     <div className="center">
  //       <LoadingIndicator />
  //     </div>
  //   );
  // }

  if (isError) {
    content = (
      <>
        <ErrorBlock
          title="Failed to load event"
          message={
            error.info?.message ||
            'Failed to load event. Please check your inputs and try again later.'
          }
        />
        <div className="form-actions">
          <Link to="../" className="button">
            Okay
          </Link>
        </div>
      </>
    );
  }
  // use this route action state to display different content based on its value
  if (data) {
    content = (
      <EventForm inputData={data} onSubmit={handleSubmit}>
        {state === 'submitting' ? (
          <p>Sending data...</p>
        ) : (
          <>
            <Link to="../" className="button-text">
              Cancel
            </Link>
            <button type="submit" className="button">
              Update
            </button>
          </>
        )}
      </EventForm>
    );
  }

  return <Modal onClose={handleClose}>{content}</Modal>;
}

export function loader({ params }) {
  return queryClient.fetchQuery({
    queryKey: ['events', params.id],
    queryFn: ({ signal }) => fetchEvent({ signal, id: params.id }),
  });
}

export async function action({ request, params }) {
  const formData = await request.formData();
  const updatedEventData = Object.fromEntries(formData);
  await updateEvent({ id: params.id, event: updatedEventData });
  await queryClient.invalidateQueries(['events']);

  return redirect('../');
}
